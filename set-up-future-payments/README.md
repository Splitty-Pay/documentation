
# Set up future payments
This repo contains the instruction and a sample that explains how integrate Splitty Pay directly in your checkout page.

Collecting payments on your website consists of creating an object to track a payment, collecting card information, and submitting the payment to Stripe for processing.


 ## Set up Splitty Pay
First of all complete Splitty Pay server integration following the guide [https://github.com/Splitty-Pay/documentation](https://github.com/Splitty-Pay/documentation).

Always decide how much to charge on the server side, a trusted environment, as opposed to the client. This prevents malicious customers from being able to choose their own prices. 

Stripe public key that must be used in your client side page is [this](https://github.com/Splitty-Pay/documentation#environments)

## Create a Customer before setup (server-side)

To set a card up for future payments, it must be attached to a  [Customer](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#12e2d02a-d54a-46dc-94e6-b29256b3fd58).
```javascript
curl --location --request POST 'https://sandbox.splittypay.it/splitty-pay/api/stripe/customers' \
--header 'Content-Type: application/json' \
--header ': {{BEARER_TOKEN}}' \
--data-raw '{
	"email": "test@splittypay.it"
}
```
You should create a Customer object when your customer creates an account with your business. If your customer is making a payment as a guest, you can create a Customer object before payment and associate it with your own internal representation of the customer’s account later.

## Create a SetupIntent
A  [SetupIntent](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#08d3532e-03f1-47ed-a712-ed578dc58943)  is an object that represents your intent to set up a customer’s card for future payments.

The SetupIntent object contains a  *client secret*, a unique key that you need to pass to Stripe.js on the client side to collect card details. The client secret lets you perform certain actions on the client, such as confirming the setup and updating payment method details, while hiding sensitive information like  `customer`. The client secret can be used to validate and authenticate card details via the credit card networks. Because of its sensitive nature, the client secret should not be logged, embedded in URLs, or exposed to anyone other than the customer.

If your application uses server-side rendering, use your template framework to embed the client secret in the page using a  [data attribute](https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes)  or a hidden HTML element.
```javascript
curl --location --request POST 'https://sandboox.splittypay.it/splitty-pay/api/stripe/setup_intents' \
--header 'Content-Type: application/json' \
--header ': {{BEARER_TOKEN}}' \
--data-raw '{
"customer="{{CUSTOMER_ID}}"	
}
```
If you only plan on using the card for future payments when your customer is present during the checkout flow, set the [usage](https://stripe.com/docs/api/setup_intents/object#setup_intent_object-usage) parameter to `on_session` to optimize authorization rates.

## Collect card details

The Setup Intents API is fully integrated with [Stripe.js](https://stripe.com/docs/stripe-js), which lets you use the Elements UI library to securely collect card details on the client side.

**Note**: When saving card details to use for future off-session payments, especially in Europe where there are regulations around card reuse, it’s important to [get permission to save a card](https://stripe.com/docs/strong-customer-authentication/faqs#mandates). Include some text in your checkout flow to inform your user how you intend to use the card.

### Set up Stripe.js
To get started with Elements, include the following script on your checkout page. Always load Stripe.js directly from js.stripe.com to remain PCI compliant. don’t include the script in a bundle or host a copy of it yourself.

You need to use this [Stripe Public Key](https://github.com/Splitty-Pay/documentation/blob/master/README.md#Environments) in order to complete the integration.

Stripe Elements is automatically available as a feature of Stripe.js. Include the Stripe.js script on your checkout page by adding it to the `head` of your HTML file. Always load Stripe.js directly from js.stripe.com to remain PCI compliant. Do not include the script in a bundle or host a copy of it yourself.

``` html
<script src="https://js.stripe.com/v3/"></script>`
```
To best leverage Stripe’s  [advanced fraud functionality](https://stripe.com/docs/radar), include this script on every page on your site, not just the checkout page. Including the script on every page  [allows Stripe to detect suspicious behavior](https://stripe.com/docs/disputes/prevention/advanced-fraud-detection)  that may be indicative of fraud as users browse your website.

### Add Elements to your page
Next, create an instance of the  [Stripe object](https://stripe.com/docs/js#stripe-function), providing SplittyPay Public  [API key](https://github.com/Splitty-Pay/documentation/blob/master/README.md#Environments)   as the first parameter. After, create an instance of the  [Elements object](https://stripe.com/docs/js#stripe-elements)  and use it to mount a  `card`  element in the DOM.

The  `card`  Element simplifies the payment form and minimizes the number of required fields by inserting a single, flexible input field that securely collects all necessary card details.

Otherwise, combine  `cardNumber`,  `cardExpiry`, and  `cardCvc`  Elements for a flexible, multi-input card form
``` js
var stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

var elements = stripe.elements();
var cardElement = elements.create('card');
cardElement.mount('#card-element');
```
A Stripe Element contains an iframe that securely sends the payment information to Stripe over a HTTPS connection. The checkout page address must also start with https:// rather than http:// for your integration to work.

You can test your integration without using HTTPS.  Enable it  when you’re ready to accept live payments.

### Confirm the SetupIntent

To complete the setup, retrieve the client secret from the SetupIntent created in the previous step and use [stripe.confirmCardSetup](https://stripe.com/docs/js/setup_intents/confirm_card_setup) and the Card element to complete the setup. When the setup completes successfully, the value of the returned SetupIntent’s `status` property is `succeeded`.

``` js
var cardholderName = document.getElementById('cardholder-name');
var cardButton = document.getElementById('card-button');
var clientSecret = cardButton.dataset.secret;

cardButton.addEventListener('click', function(ev) {

  stripe.confirmCardSetup(
    clientSecret,
    {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: cardholderName.value,
        },
      },
    }
  ).then(function(result) {
    if (result.error) {
      // Display error.message in your UI.
    } else {
      // The setup has succeeded. Display a success message.
    }
  });
});`
```

**Note**: `stripe.confirmCardSetup` may take several seconds to complete. During that time, disable your form from being resubmitted and show a waiting indicator like a spinner. If you receive an error, show it to the customer, re-enable the form, and hide the waiting indicator. If the customer must perform additional steps to complete the payment, such as authentication, Stripe.js walks them through that process.

The SetupIntent verifies that the card information your customer is using is valid on the network. However, automatic verification isn’t always performed. For details on this, see  [Check if a card is valid without a charge](https://support.stripe.com/questions/check-if-a-card-is-valid-without-a-charge). Also, don’t maintain long-lived, unhandled SetupIntents as they may no longer be valid when you call  [stripe.confirmCardSetup](https://stripe.com/docs/js#stripe-confirm-card-setup).

You now have a flow to collect card details and handle any authentication requests. Use the test card  `4000 0025 0000 3155`, along with any CVC, postal code, and future expiration date to test the authentication process.

When saving cards to charge later, it’s important to get customer permission up front. Add text in your checkout flow that references the terms of the payment, for example:

`I authorise [your business name] to send instructions to the financial institution that issued my card to take payments from my card account in accordance with the terms of my agreement with you.`

When the SetupIntent succeeds, the resulting PaymentMethod ID (in  `result.setupIntent.payment_method`) will be saved to the provided Customer.

## Charge the saved card later

When you are ready to charge your customer off-session, use the Customer and PaymentMethod IDs to create a [Charge](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#974de2a0-48f0-436c-98e5-91b7a1ee72b0).
```javascript
curl --location --request POST 'https://sandbox.splittypay.it/splitty-pay/api/charges' \
--header 'Content-Type: application/json' \
--header ': {{BEARER_TOKEN}}' \
--data-raw '{
	"amount": 500,
	"paymentMethod": "card_1GdB7ZCbfNWWRVQLByEb9E4X",
	"notificationUrl": "https://webhook.site/4ce532b5-7ccc-4373-a1f9-85618d78d234",
	"cart": "1234",
	"description": "A direct payment",
	"preAuth": false,
	"details": {
		"language": "IT",
		"email": "federico@splittypay.com"
	},
	"customerId": "cus_GZ0HinvzWy68BK",
	"offSession": false
}'
```
In order ti retrive the PaymentMethod use the [Customer API](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#9202184d-171f-4b55-b5bf-19200e41fcc5)

When you have the Customer and PaymentMethod IDs, create a PaymentIntent with the amount and currency of the payment. Set a few other parameters to make the off-session payment:

-   Set  *off_session* to  `true`  to indicate that the customer is not in your checkout flow during this payment attempt. This causes the PaymentIntent to throw an error if authentication is required.
-   Set  `paymentMethod` to the ID of the PaymentMethod and  `customerId` to the ID of the Customer.

**Note**: if you not provide  _customerId_  param and you have saved multiple customers with the same  _email_  an error is thrown

When a payment attempt fails, the request also fails with a 402 HTTP status code and the status of the PaymentIntent is  [requires_payment_method](https://stripe.com/docs/upgrades#2019-02-11). You need to notify your customer to return to your application (e.g., by sending an email or in-app notification) to complete the payment. Check the code of the  [Error](https://stripe.com/docs/api/errors/handling)  raised by the Stripe API library or check the  [last_payment_error.decline_code](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-last_payment_error-decline_code)  on the PaymentIntent to inspect why the card issuer declined the payment.

If the payment failed due to an  [authentication_required](https://stripe.com/docs/declines/codes#authentication_required)  decline code, use the declined PaymentIntent’s client secret and  [payment method](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-last_payment_error-payment_method)  with confirmCardPayment to allow the customer to authenticate the payment.

```javascript
// Pass the failed PaymentIntent to your client from your server
stripe.confirmCardPayment(intent.client_secret, {
  payment_method: intent.last_payment_error.payment_method.id
}).then(function(result) {
  if (result.error) {
    // Show error to your customer
    console.log(result.error.message);
  } else {
    if (result.paymentIntent.status === 'succeeded') {
      // The payment is complete!
    }
  }
});
```

If the payment failed for other reasons, such as insufficient funds on the card, send your customer to a payment page to enter a new card. You can reuse the existing PaymentIntent to attempt the payment again with the new card details.

## Test the integration
By this point you should have an integration that:

1.  Collects and saves card details without charging the customer by using a SetupIntent
2.  Charges the card off-session and has a recovery flow to handle declines and authentication requests

There are several test cards you can use to make sure this integration is ready for production. Use them with any CVC, postal code, and future expiration date.

|Number  | Description |
|--|--|
| 4242 4242 4242 4242 | Succeeds and immediately processes the payment |
| 4000 0025 0000 3155| Requires authentication for the initial purchase, but succeeds for subsequent payments (including off-session ones) as long as the card is setup with setup_future_usage|
|4000 0000 0000 9995 | Always fails (including the initial purchase) with a decline code of  `insufficient_funds`. |
