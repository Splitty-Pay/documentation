# BankWire SEPA Credit Transfer payments with Sources of Stripe

SplittyPay - Stripe users in Europe can receive SEPA Credit Transfers directly from customers using  [Sources](https://stripe.com/docs/sources)—a single integration path for creating payments using any supported method.

During the payment process, a  [Source](https://stripe.com/docs/api#sources)  object is created and your customer is provided with an IBAN. Your customer uses this IBAN to make a transfer from their bank account using the SEPA system. After the transfer is received, SplittyPay provide to transfer the amount in your [Connected](https://stripe.com/docs/connect) account.

SEPA Credit Transfers is a  [push](https://stripe.com/docs/sources#pull-or-push-of-funds)-based and  [reusable](https://stripe.com/docs/sources#single-use-or-reusable)  method of payment. This means your customer must take action to send funds to you, which can take a few days to arrive. Once the funds have arrived, there a Server to Server notification is made.

## Step 1: Create a Source object
A `Source` object is created server-side using the [Source creation endpoint]([https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#a7079043-a0b5-4f9e-8e05-debef7b621a0](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#a7079043-a0b5-4f9e-8e05-debef7b621a0)), with the following parameters:
|Parameter|Value |Mandatory
|--|--|--|
| `currency` | **eur**  (SEPA Credit Transfer payments must be in EUR) |true
| `owner[email]` | the full email address of the customer|true
| `owner[name]` | the full name the customer|false
|`metadata[cart]`| the customer transaction reference|false

Automatically `type` parameter is set to  `sepa_credit_transfer`.

Request example:
``` bash
curl {{base_url}}/api/stripe/sources \
--header 'Content-Type: application/json' \
--header ': ' \
--header 'Authorization: Bearer {{auth_token}} \
--data-raw '{
    "currency": "eur",
    "owner": {
        "name": "Federico Gatti",
        "email": "example@splittypay.com"
    },
    "metadata": {
        "cart": "123"
    }
}'
```
SplittyPay will forward your request to Stripe and a `Source` object containing the relevant details for the method of payment used. Information specific to SEPA is provided within the `sepa_credit_transfer` subhash.

``` json
{
  "id": "src_18cPLvAHEMiOZZp1YBngt7Yv",
  "object": "source",
  "currency": "eur",
  "flow": "receiver",
  "livemode": false,
  "receiver": {
    "address": "DE89370400440532013000",
    "amount_received": 0,
    "amount_charged": 0,
    "amount_returned": 0,
    "refund_attributes_status": "missing",
    "refund_attributes_method": "email"
  },
  "sepa_credit_transfer": {
    "iban": "DE89370400440532013000",
    "bank_name": "TEST BANK",
    "bic": "TESTDE00",
  },
  "owner": {
    "address": null,
    "email": "example@splittypay.com",
    "name": null,
    "phone": null,
    "verified_address": null,
    "verified_email": null,
    "verified_name": null,
    "verified_phone": null
  },
  "status": "pending",
  "type": "sepa_credit_transfer",
  "usage": "reusable"
}
```
Retrieve your `Source` using [Retrieve API]([https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#476c43fc-4ac6-481f-8d13-f16672def0d2](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#476c43fc-4ac6-481f-8d13-f16672def0d2)).

## Step 2: Have the customer push funds

When creating a source, its status is initially set to  `pending` . In addition,  `receiver[amount_received]`  is set to zero since no funds have yet been transferred. Your customer must transfer the amount you request so that the necessary funds are available.

After creating a source, you should provide your customer the  `sepa_credit_transfer[iban]`, the  `sepa_credit_transfer[bic]`, and the amount you need the customer to send. Customers create a transfer with their bank, using the information you provide. Bank transfers can take up to two days to complete, but typically complete within a day from when the customer sends the funds.

SEPA Credit Transfer sources are reusable and can be used for recurring payments. The information provided to the customer can be reused whenever they need to send additional funds.

## Step 3: Splitty Pay makes Transfer to your Account

Once the customer makes a transfer, `receiver[amount_received]` is updated to reflect the total amount of all received transfers, and the status of the source transitions to `chargeable` (if it was already `chargeable` it will not change). Your customer can transfer any amount across multiple transfers.

After the Source becomes chargeable Splitty Pay will automatically transfer the receveid amount, minus the fees, to your [Connect](https://stripe.com/docs/connect) account using a [Separate and Charge transfer]([https://stripe.com/docs/connect/charges-transfers](https://stripe.com/docs/connect/charges-transfers)). The `transfer_group`  parameter of `Transfer` object will be set using `Source.id`, in this way you can retrieve all the transfers refereing of a Source using this parameter inside the Stripe Dashboard.

Since these transfers happen asynchronously (and can take days), it is essential that your integration rely on Server to Server notification in order to verify the payments.

## Step 4:  Confirm that the charge has succeeded

Once the transfer of the found from Splitty Pay to the Merchant Account is completed, the merchant is notified with the output of the transfer with a server to server communication using the  _**notificationUrl**_  [Profile](https://github.com/Splitty-Pay/documentation#Profile-API) parameter.

To do so our system must call a public REST service provided by the merchant. This service must have the following characteristics:

-   verb is **POST**
-   protocol is `https`
-   [Optional] authentication basic

The body request contains these information:

``` json
{
    "cart": "123",
    "ref": "src_1GICZOCbfNWWRVQLV0SclOm3",
    "totalAmount": 10000,
    "status": "COMPLETED"
}
```

The service has a timeout time equal to 5 seconds and it expects a 200 code response. Splitty Pay will retrie up to 20 times if the notification fails.

## Testing SEPA Credit Transfer payments
When creating a  `Source`  object, a transaction is automatically created on the source. A  `source.chargeable`  and a  `source.transaction.created`  webhook event are sent immediately to SplittyPay (not to you), so SplittyPay will create immediatly a `Transfer` to your Account.

The amount included in the test transaction defaults to €10.00. You can customize this amount by providing an email address of  `amount_[custom_amount]@example.com`  as the value for  `owner[email]`. For instance, to create a test transaction of the amount €42.42, use  `amount_4242@example.com`.

## Source transactions
Unlike other push-based payment methods, a SEPA Credit Transfer source has no required amount that your customer must send. You can instruct your customer to send any amount, and it can be made up of multiple transfers. Your customers can also send additional amounts when necessary (e.g., recurring payments). As such, sources can have multiple associated transactions. After receiving a transfer from the customer of any amount, the source becomes chargeable and is ready to use.

For instance, if you request your customer to send €100, they can send the full amount in a single transfer or multiple transfers of smaller amounts (e.g., four transfers of €25). In the case of recurring payments, your customer could create a recurring transfer with their bank for a specified amount, ensuring that the source always has the correct amount of funds for you to create the necessary charge requests. If the recurring amount varies, your customer can send the correct amount whenever necessary.

Once a transfer has been received, the source’s  `receiver[amount_received]`  value represents the total that has been received and available for creating a charge with. Further transfers result in additional transactions being created, and the amount is added to the available value for  `receiver[amount_received]`.
