# SOFORT payments with Sources
During the payment process, a  [Source](https://stripe.com/docs/api#sources)  object is created and your customer is redirected to the SOFORT web interface for authentication of their banking credentials. After completing this, your integration uses the source to make a charge request and complete the payment.

SOFORT is a  push-based,  single-use, and  asynchronous method of payment. This means your customer takes action to send the amount to you through a  [redirect](https://stripe.com/docs/sources#flow-for-customer-action)  and it typically takes 2 business days but can take up to 14 days to confirm the success or failure of a payment.

## Step 1:  Create a Source object

A  `Source`  object server-side using the  [Source creation endpoint](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#1d08af19-707b-4e94-8769-02c7f013fc7b), with the following parameters:

|Parameter|Value  |
|--|--|
|`type`  | **sofort** |
|`amount`|A positive integer in the smallest currency unit representing the amount to charge the customer (e.g.,  **1099**  for a €10.99 payment).|
|`currency`|**eur**|
|`redirect[return_url]`|The URL the customer should be redirected to after the authorization process.
|`sofort[country]`|The  [ISO-3166 2-letter country code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements)  of the customer’s bank.|
|`sofort[preferred_language]` (optional) |The preferred language of the SOFORT authorization page that the customer is redirected to. Supported values are:  **de**,  **en**,  **es**,  **it**,  **fr**,  **nl**, or  **pl**.|
|`statement_descriptor`  |A custom statement descriptor for the payment.|

example

```json
{
  "type": "sofort",
  "amount": 1099,
  "currency": "eur",
  "owner": {
        "name": "succeeding_charge",
        "email": "federico@splittypay.com"
    },
  "redirect": {
    "return_url": "https://shop.example.com/crtA6B28E1"
  },
  "sofort": {
    "country": "DE"
  },
  "metadata": {
    "cart": "123"
  }
}
```

Response
```json
{
  "id": "src_16xhynE8WzK49JbAs9M21jaR",
  "object": "source",
  "amount": 1099,
  "client_secret": "src_client_secret_UfwvW2WHpZ0s3QEn9g5x7waU",
  "created": 1445277809,
  "currency": "eur",
  "flow": "redirect",
  "livemode": true,
  "owner": {
    "address": null,
    "email": null,
    "name": "Jenny Rosen",
    "phone": null,
    "verified_address": null,
    "verified_email": null,
    "verified_name": "Jenny Rosen",
    "verified_phone": null
  },
  "redirect": {
    "return_url": "https://shop.example.com/crtA6B28E1",
    "status": "pending",
    "url": "https://hooks.stripe.com/redirect/src_16xhynE8WzK49JbAs9M21jaR?client_secret=src_client_secret_UfwvW2WHpZ0s3QEn9g5x7waU"
  },
  "statement_descriptor": null,
  "status": "pending",
  "type": "sofort",
  "usage": "single_use",
  "sofort": {
    "country": "DE",
    "bank_code": null,
    "bic": null,
    "bank_name": null,
    "iban_last4": null,
    "preferred_language": null,
    "statement_descriptor": null
  }
}
```
### Optional:  Providing a custom statement descriptor

SOFORT requires a statement descriptor  before the customer is redirected to authenticate the payment. You can provide a custom descriptor by specifying  `statement_descriptor`  when creating a source. SOFORT statement descriptors support a maximum of 35 characters and cannot contain the special characters  `/`,  `(`,  `)`,  `{`, or  `}`.

### Error codes[](https://stripe.com/docs/sources/sofort#error-codes)

Source creation for SOFORT payments may return any of the following errors:


| ERROR | DESCRIPTION |
|--|--|
| `payment_method_not_available`|The payment method is currently not available. You should invite your customer to fallback to another payment method to proceed.|
| `processing_error` |An unexpected error occurred preventing us from creating the source. The source creation should be retried.
|`invalid_amount`|The source amount is invalid. SOFORT enforces a minimum payment amount of 1 EUR.
|`invalid_sofort_country`|The owner’s country is not supported by SOFORT. The countries supported are listed above.

## Step 2:  Have the customer authorize the payment

When creating a source, its status is initially set to  `pending`  and cannot yet be used to create a charge. Your customer must authorize a SOFORT payment to make the source chargeable. To allow your customer to authorize the payment, redirect them to the URL provided within the  `redirect[url]`  attribute of the  `Source`  object.

After the authorization process, your customer is redirected back to the URL provided as a value of  `redirect[return_url]`. This happens regardless of whether authorization was successful or not. If the customer has authorized the payment, the  `Source`  object’s status is updated to  `chargeable`  and it is ready to use in a charge request. If your customer declines the payment, the status transitions to  `failed`.

Stripe populates the  `redirect[return_url]`  with the following GET parameters when returning your customer to your website:

-   `source`: a string representing the original ID of the  `Source`  object
-   `livemode`: indicates if this is a live payment, either  `true`  or  `false`
-   `client_secret`: used to confirm that the returning customer is the same one who triggered the creation of the source (source IDs are not considered secret)

You may include any other GET parameters you may need when specifying  `redirect[return_url]`. Do not use the above as parameter names yourself as these would be overridden with the values we populate.

## Step 3:  Rely Source webhook

Once the customer has authenticated the payment, the source’s  `status`  transitions to  `chargeable`  and it can be used to make a charge request. This transition happens asynchronously and may occur after the customer was redirected back to your website.

SplittyPay will automatically charge for you the source object. Merchant will be notified directly by Stripe using [webhooks](https://stripe.com/docs/webhooks) in order to be updated of the customer authentication process.
For these reasons it is essential that your integration rely on [webhooks](https://stripe.com/docs/webhooks).

### Webhooks[](https://stripe.com/docs/sources/sofort#webhooks)

The following webhook events are sent to notify you about changes to the source’s status:
| EVENT | DESCRIPTION |
|--|--|
|`source.chargeable`  | A  `Source`  object becomes  `chargeable`  after a customer has authenticated and verified a payment. |
|`source.failed`|A  `Source`  object failed to become chargeable as your customer declined to authenticate the payment.|
|`source.canceled`|A  `Source`  object expired and cannot be used to create a charge.|

Some customers using SOFORT assume that the order process is complete once they have authenticated the payment and received confirmation from their bank. This results in customers who close their browser instead of following the redirect and returning to your app or website.

## Step 4:  Confirm that the charge has succeeded

Since SOFORT is an asynchronous payment method, the payment  status remains in a pending state for up to 14 days from its creation (also known as the cut-off date). Once the charge is confirmed—and the funds guaranteed— Splittypay will send you a notification (defined by *notificationUrl* in your [profile](https://github.com/Splitty-Pay/documentation#profile-api)) that confirm (or reject) the payment.

Example of **accepted** payment

```json
{"totalAmount":1099,"ref":"src_1GijWSCbfNWWRVQLePFhUPFS","cart":"123","status":"COMPLETED"}
```
rejected payment
```json
{"totalAmount":1099,"ref":"src_1Gik0xCbfNWWRVQLBF0OqwEm","cart":"123","status":"FAILED"}
```
If payment will be accepted a transfert of the amount (minus the processing fee) will be made from Splittypay account to the merchant Account.
 
We recommend that you rely on these webhook events to notify your customer of their payment status.

### Disputed payments

The risk of fraud or unrecognized payments is much lower as the customer must authenticate the payment with their bank. As such, there is no dispute process that can result in a chargeback and funds withdrawn from your Stripe account. Should a customer dispute a payment to their bank, it is handled internally—no dispute information is presented in the Dashboard.

### Failed charges

If a charge has not been confirmed within the cut-off time, the charge’s status is automatically transitioned from  `pending`  to  `failed`. Additionally, if the funds are received after the cut-off date, the customer is automatically refunded.

On average, approximately 0.2% of SOFORT charges can be expected to fail. This may vary based on your industry or customer base. Depending on your average payment amount, the type of products or service being provided, and risk associated with your business, you may prefer to fulfill orders only once the  `charge.succeeded`  webhook has been received.

### Source expiration

A source must be used within six hours of becoming  `chargeable`. If it is not, its status is automatically transitioned to  `canceled`  and your integration receives a  `source.canceled`  webhook event. Additionally,  `pending`  sources are canceled after one hour if they are not used to authenticate a payment.

Once a source is canceled, the customer’s authenticated payment is refunded automatically—no money is moved into your account. For this reason, make sure the order is canceled on your end and the customer is notified once you receive the  `source.canceled`  event.

### Testing charge success and failure

You can mimic a successful or failed charge by creating a test source with one of the following values for the  `owner[name]`  parameter. Use this source to create a test charge that either succeeds or fails.

-   **succeeding_charge**: The charge status transitions from pending to succeeded
-   **failing_charge**: The charge status transitions from pending to failed

When creating a test charge with this source, the charge’s status is initially set to  `pending`  before being automatically transitioned. Webhook events are also triggered when using test sources and charges. The  `charge.pending`  event is first triggered, followed by either the  `charge.succeeded`  or  `charge.failed`  event immediately after.
