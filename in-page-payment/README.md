
# In web page payment sample
This repo contains the instruction and a sample that explains how integrate Splitty Pay directly in your checkout page.

Collecting payments on your website consists of creating an object to track a payment, collecting card information, and submitting the payment to Stripe for processing.


 ## Set up Splitty Pay and create a Payment Request
In you backend Server application follow the guide [https://github.com/Splitty-Pay/documentation](https://github.com/Splitty-Pay/documentation) in order to authenticate to Splitty Pay platform and after that register the Payment Request with a call directly from your backend application [https://github.com/Splitty-Pay/documentation#Merchant-API](https://github.com/Splitty-Pay/documentation#Merchant-API). Always decide how much to charge on the server side, a trusted environment, as opposed to the client. This prevents malicious customers from being able to choose their own prices. 

In the request include ***type: "MONO"*** attribute in order to inform Splitty Pay that the flow is a standard Mono card payment.

Included in the returned PaymentRequest are a *clientSecret* and *publicKey*, which you need to use to complete the Payment Request. 

## Collect card details

You’re ready to collect card information on the client with **Stripe Elements**. Stripe Elements is a set of prebuilt UI components for collecting and validating card number, ZIP code, and expiration date. Note, use the *clientSecret* value returned in the previous request in order to initialize Stripe.js SDK client.

### Set up Stripe.js
You can find more detailed documentation here [https://stripe.com/docs/payments/accept-a-payment](https://stripe.com/docs/payments/accept-a-payment).

You need to use this [Stripe Public Key](https://github.com/Splitty-Pay/documentation/blob/master/README.md#Environments) in order to complete the integration.

**Note**: you need to implement only the frontend operation, because all the backend requests are made by Splitty Pay.

Stripe Elements is automatically available as a feature of Stripe.js. Include the Stripe.js script on your checkout page by adding it to the `head` of your HTML file. Always load Stripe.js directly from js.stripe.com to remain PCI compliant. Do not include the script in a bundle or host a copy of it yourself.

``` html
<head>
  <title>Checkout</title>
  <script src="https://js.stripe.com/v3/"></script>
</head>
```
Create an instance of Elements with the following JavaScript on your checkout page:

``` js
var stripe = Stripe(paymentRequest.clientSecret);
var elements = stripe.elements();
```
### Add Elements to your page
Elements needs a place to live in your payment form. Create empty DOM nodes (containers) with unique IDs in your payment form and then pass those IDs to Elements.
``` html
<div id="card-element">
  <!-- Elements will create input elements here -->
</div>

<!-- We'll put the error messages in this element -->
<div id="card-errors" role="alert"></div>

<button id="submit">Pay</button>
```
When the form above has loaded,  [create an instance](https://stripe.com/docs/stripe-js/reference#elements-create)  of an Element and mount it to the Element container:

``` js
// Set up Stripe.js and Elements to use in checkout form
var style = {
  base: {
    color: "#32325d",
  }
};

var card = elements.create("card", { style: style });
card.mount("#card-element");`
```
The `card` Element simplifies the form and minimizes the number of required fields by inserting a single, flexible input field that securely collects all necessary card and billing details. Otherwise, combine `cardNumber`, `cardExpiry`, and `cardCvc` Elements for a flexible, multi-input card form.

Elements validates user input as it is typed. To help your customers catch mistakes, listen to `change` events on the `card` Element and display any errors:

``` js
card.addEventListener('change', function(event) {
  var displayError = document.getElementById('card-errors');
  if (event.error) {
    displayError.textContent = event.error.message;
  } else {
    displayError.textContent = '';
  }
});
```
## Submit the payment to Stripe

Rather than sending the entire PaymentIntent object to the client, use its  [client secret](https://stripe.com/docs/api/payment_intents/object#payment_intent_object-client_secret)  from  previous step.

To complete the payment when the user clicks, retrieve the client secret from the PaymentIntent you created in step two and call  [stripe.confirmCardPayment](https://stripe.com/docs/stripe-js/reference#stripe-confirm-card-payment)  with the client secret.

Pass additional billing details, such as the cardholder name and address, to the  `billing_details`  hash. The  `card`  Element automatically sends the customer’s postal code information. However, combining  `cardNumber`,  `cardCvc`, and  `cardExpiry`  Elements requires you to pass the postal code to  `billing_details[address][postal_code]`.
``` javascript
var submitButton = document.getElementById('submit');

submitButton.addEventListener('click', function(ev) {
  stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: card,
      billing_details: {
        name: 'Jenny Rosen'
      }
    }
  }).then(function(result) {
    if (result.error) {
      // Show error to your customer (e.g., insufficient funds)
      console.log(result.error.message);
    } else {
      // The payment has been processed!
      if (result.paymentIntent.status === 'succeeded') {
        // Show a success message to your customer
        // There's a risk of the customer closing the window before callback
        // execution. Set up a webhook or plugin to listen for the
        // payment_intent.succeeded event that handles any business critical
        // post-payment actions.
      }
    }
  });
});
```

If the customer must authenticate the card, Stripe.js walks them through that process by showing them a modal. You can see an example of this modal experience by using the test card number  `4000 0025 0000 3155`  with any CVC, future expiration date, and postal code in the  [demo](https://stripe.com/docs/payments/accept-a-payment#demo)  at the top of the page.

When the payment completes successfully, the value of the returned PaymentIntent’s  `status`  property is succeeded.

## Save a card after a payment and future charge

If you want to save the Card details for future charge you need to add  `setup_future_usage: 'off_session'` during the stripe.ConfirmCardPayment call

``` js 
stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: card,
    billing_details: {
      name: 'Jenny Rosen'
    }
  },
  setup_future_usage: 'off_session'
}).then(function(result) {
  if (result.error) {
    // Show error to your customer
    console.log(result.error.message);
  } else {
    if (result.paymentIntent.status === 'succeeded') {
      // Show a success message to your customer
      // There's a risk of the customer closing the window before callback execution
      // Set up a webhook or plugin to listen for the payment_intent.succeeded event
      // to save the card to a Customer

      // The PaymentMethod ID can be found on result.paymentIntent.payment_method
    }
  }
});
```
If paymentIntent succeeded SplittyPay automatically will create (or update) a customer with the inserted payment information. The email will be the value provided during the *PaymentRequest* phase.

You can retrieve the PaymentMethods associates to a customer using his email and the */customers?email={value}* API [https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#b7ef7ed6-96b9-493d-b4c5-cd1a325e220d](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#b7ef7ed6-96b9-493d-b4c5-cd1a325e220d) 

```bash
curl --location --request GET 'https://sandbox.splittypay.it/splitty-pay/api/customers?email=example@splittypay.com' \
--header 'Content-Type: application/json' \
--data-raw ''
```

After that, you can use the /charges API [https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#974de2a0-48f0-436c-98e5-91b7a1ee72b0](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#974de2a0-48f0-436c-98e5-91b7a1ee72b0) in order to charge a customer using a specified PaymentMethod, for example

```javascript
curl --location --request POST 'https://sandbox.splittypay.it/splitty-pay/api/charges' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "example@splittypay.com",
    "amount": 1000,
    "paymentMethod": "pm_1G0qRlCbfNWWRVQLCMNyWrEL",
    "notificationUrl": "https://webhook.site/cec9732d-71a3-4151-9746-f1d0bdc5a304",
    "cart": "1234",
    "description": "A direct payment",
    "details": {
        "language": "IT", 
        "email": "example@splittypay.com"
    }
}'
```
The response is synchronous, anyway a Server to Server notification is sent to *notificationUrl*.

When you use */charges* SplittyPay automatically create a new PaymentRequest request and link it to the Interaction object. 

## Test the integration
By this point you should have a basic card integration that collects card details and makes a payment.

There are several test cards you can use in test mode to make sure this integration is ready. Use them with any CVC, and future expiration date.

|Number  | Description |
|--|--|
| 4242 4242 4242 4242 | Succeeds and immediately processes the payment |
| 4000 0025 0000 3155| Requires authentication for the initial purchase, but succeeds for subsequent payments (including off-session ones) as long as the card is setup with setup_future_usage|
|4000 0000 0000 9995 | Always fails (including the initial purchase) with a decline code of  `insufficient_funds`. |
