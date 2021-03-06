
# Guide for integration

# Table of contents
1. [Authentication API](#Authentication-API)
2. [Merchant API](#Merchant-API)
3. [Profile API](#Profile-API)
4. [Postman documentation](#Postman-documentation)
5. [Environments](#Environments)
7. [Contacts](#Contacts)

## Authentication API

In order to call the SplittyPay APIs, the merchant must request a grant authorization using the OAuth2 protocol. If the authorization process is successfully completed an access token will be returned and can be used to call the APIs.

The following lines represents two examples of alternatives Oauth2 token requests:

```bash
 $ curl -X POST 'secure.splittypay.it/splitty-pay/oauth/token?grant_type=password&username=username&password=password' -H 'Authorization: Basic \<base64token>' 
 ```

Base64Token is **clientId:clientSecret** in base64

An example using Java OkHttpClient could be:

```java
Request request = new Request.Builder()
         .url("secure.splittypay.it/splitty-pay/oauth/token?grant_type=password&username=username&password=password")
         .post(RequestBody.create(MediaType.parse("application/json"), ""))
         .build(); 

Response response = client.newCall(request).execute();
System.out.println(response.body().string());
```

The response body includes this information:

```json
 { 
	 "access_token": "2305a446-2026-4c03-9249-430bcc25858f",
	 "token_type": "bearer",
	 "refresh_token": "90bcad49-9dfb-4907-9ad3-4a6b700217f5",
	 "expires_in": 35976,
	 "scope": "write read" 
}
```
If an expired token is sent, an HTTP 401 response is returned with the following payload:
```json
{  
	"error": "invalid_token",  
	"error_description": "Invalid access token: 69d9a48a-7397-4804-a-a37-9b25baf3e48e"
}
```
When the token expires the client can use the refresh token to request a new token, this is an example:

```bash
$ curl -X POST 'secure.splittypay.it/splitty-pay/oauth/token?refresh_token=5a0d533a-b6b1-4706-8058b9d66443f7a1&grant_type=refresh_token' -H 'Authorization: Basic \<base64token>'
```

## Merchant API

### Payment Registration

This API must be used to register a payment that the user will complete in order to finalize the cart.

 https://secure.splittypay.it/splitty-pay/api/register-payment

In the header insert Authorization: Bearer<access_token>

Request body example:

```json
{
	"amount": 10000,
	"currency": "EUR",
	"cart": "1234",
	"notificationUrl": "https://webhook.site/b68b438a-c9a3-4748-94a6-6767697e9518",
	"successUrl": "http://successUrl",
	"cancelUrl": "http://errorUrl",
	"preAuthTypology": "STRONG",
	"type": "MULTI",
	"details": {
		"language": "IT", 
		"email": "demo@splittypay.com"
	}
}
```

If email is not present the first step of our payment workflow will ask for it.

Response body example:

```json
{
    "id": 455,
    "amount": 10000,
    "currency": "EUR",
    "timestamp": 1569333759,
    "ref": "UZ9SUD2RHE7NYwUi2t9gbduAloHGeqjkSpANbQDlr3pSVg2IiV",
    "preAuthTypology": "STRONG",
    "status": "PENDING",
    "notificationUrl": "https://webhook.site/b68b438a-c9a3-4748-94a6-6767697e9518",
    "successUrl": "http://successUrl",
    "cancelUrl": "http://errorUrl",
    "redirectUrl": "https://sandbox.splittypay.it/splitty-pay/payment-page/UZ9SUD2RHE7NYwUi2t9gbduAloHGeqjkSpANbQDlr3pSVg2IiV"
}
```

The request object has the following structure:

|Name            |Type                           |Constraints                         |
|----------------|-------------------------------|-----------------------------|
|amount			 |Integer                        |`NotNull` and `>= 500`            |
|currency          |Enumeration            |[EUR, USD, GBP] and `NotNull`            |
|cart          |String(45)|`NotBlank`|
|notificationUrl| String | `Valid Url`
|successUrl| String|
|cancelUrl| String|
|expiration| Date | `Future`
|preAuthTypology|Enumeration (default STRONG)|[STRONG, WEAK]
|type| Enumeration (default MULTI) |[MULTI, MONO]
|details| RegistrationPaymentRequestDetails | 

- The ***amount*** field must be multiplied by 100 (to represent 5 euros the amount field must be 500).  
- The ***date*** field must be of the type Y Y-MM-DDTHH:MM:SS.SSSZ
- The ***preAuthTypology*** field defines the PreAuthorization and PayIn flow of the Payment Request (for more details about contact us at supporto@splittypay.com). 
- The ***status*** of an inserted Payment Request is always PENDING. 

Here is the details structure (that can be enlarged with more data):

|Name            |Type                           |Constraints                         |
|----------------|-------------------------------|-----------------------------|
|ipAddress			 |String                        |           |
|email          |String          |`Valid email format`            |

### Payment confirmation

Splitty Pay and its payment processor partner manages all the collection, authorization and capture of the customer cards. Once the customer clicks on the “Pay now” button, the merchant is notified with the output of the transaction (Y/N) with a server to server communication using the ***notificationUrl*** parameter.

To do so our system must call a public REST service provided by the merchant. This service must have the following characteristics:

- verb is POST  
- protocol is https
- [Optional] authentication basic

If authentication is not provided the ***notificationUrl*** must be unique and randomly generated for each payment request.

The body request contains these information:
```json
{
	"cart": "123",
	"ref": "UZ9SUD2RHE7NYwUi2t9gbduAloHGeqjkSpANbQDlr3pSVg2IiV",
	"totalAmount": 10000,
	"status": "COMPLETED"
}
```

At the notification instant the status could be: COMPLETED or DELETED.

The service has a timeout time equal to 5 seconds and it expects a 200 code response.

### Retrieve Payments

Splitty Pay provides you several API in order to retrive payments information.  

- **GET /payments/{id}**: return a single payment by its ID
- **GET /payments/getsByRef/{ref}**: return a single payment by its ref
- **GET /payments**: return a Paginated result with all your payments. You can also filter by same field (all query params are optional):
	-  email: default value WILDCARD
	- start (pattern yyyy-MM-dd): default value 1970-01-01
	- end (pattern yyyy-MM-dd): default value "today"
	- page: default value 0
	- size: default value 25
	
	eg ***https://secure.splittypay.it/splitty-pay/api/payments?start=2019-08-10&end=2019-09-11&email=demo@splittypay.com&page=1&size=35***

You need to be authenticated with READ scope in order to use these APIs.

Example of single response:
```json
{
    "id": 410,
    "cart": "1234",
    "email": "demo@splittypay.com",
    "description": null,
    "amount": 10000,
    "currency": "EUR",
    "notificationUrl": "https://webhook.site/03aed2a8-3af6-404e-b399-a99c00b6cb7b",
    "expiration": "2019-09-12T16:49:55Z",
    "creation": "2019-09-10T22:30:22Z",
    "language": "IT",
    "status": "COMPLETED",
    "emailStatus": "SENT",
    "preAuthTypology": "STRONG",
    "notificationStatus": "OK",
    "notificationAttempts": 0,
    "successUrl": "http://successUrl",
    "cancelUrl": "http://errorUrl",
    "type": "MULTI",
    "ref": "IuPc8iIXRJt6rImTQROHL040KcpWYdWutk1DcuGlpULxK4VHUx"
}
```
Paginated result structure:
```json
{
    "content": [
    {...},
    {...}
    ],
    "pageable": {
        "sort": {
            "sorted": false,
            "unsorted": true,
            "empty": true
        },
        "pageNumber": 0,
        "pageSize": 25,
        "offset": 0,
        "paged": true,
        "unpaged": false
    },
    "last": true,
    "totalPages": 1,
    "totalElements": 3,
    "sort": {
        "sorted": false,
        "unsorted": true,
        "empty": true
    },
    "numberOfElements": 3,
    "first": true,
    "size": 25,
    "number": 0,
    "empty": false
}
```

## Profile API

The [Profile API]([https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#3e7cbf6e-ccb7-4f42-9a5f-241651bac970](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest#3e7cbf6e-ccb7-4f42-9a5f-241651bac970)) allow you to define the Account profile variables like:

 
| Parameter | Description | Constraint
|--|--|--|
|`email` | Merchant notification email|
|`logoDescriptionUrl` | The logo will appear in the checkout page| URL must be `https`
|`logoEmailUrl`| The logo will appear in the email sended to the customer | URL must be `https`
|`notificationUrl`| The endpoint that will be notified for ServerToServer of [Transfer]([https://github.com/Splitty-Pay/bankwire-documentation](https://github.com/Splitty-Pay/bankwire-documentation)) | URL must be `https`


### Example of request to retrieve informations
```bash
curl --location --request GET '{base_url}/api/profile'
```
``` json
{
	"name": "splittypay",
	"active": "true",
	"logoDescriptionUrl": "https://www.splittypay.com/assets/img/logo_purple.png",
	"logoMailUrl": "https://www.splittypay.com/assets/img/logo_purple.png",
	"email": "federico@splittypay.com",
	"notificationUrl": "https://webhook.site/7d4e30a3-b137-49d4-9a34-2d224e344301"
}
```

### Example of request to update informations
```bash
curl --location --request PATCH 'https://sandbox.splittypay.it/splitty-pay/api/profile' \
--header 'Content-Type: application/json' \
--data-raw '{
	"email": "example@splittypay.com",
	"logoDescriptionUrl": "https://www.splittypay.com/assets/img/logo_purple.png",
	"logoMailUrl": "https://www.splittypay.com/assets/img/logo_purple.png",
	"notificationUrl": "https://webhook.site/7d4e30a3-b137-49d4-9a34-2d224e344301"

}'
```


## Postman documentation

The complete documentation of the REST API is available at [https://documenter.getpostman.com/view/1912948/SVtWwnQG?version=latest](https://documenter.getpostman.com/view/1912948/SW11Xdy5?version=latest)

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/554bcabca4269f0022ed)

## Environments


|  |Sandbox  |Production |
|--|--|--|
|BaseUrl  | https://sandbox.splittypay.it/splitty-pay/ |https://secure.splittypay.it/splitty-pay/ |
|Stripe Public Key  |  `pk_test_XAWBDuV0t4cFqBXNgPaOcfdI00Bnzum9Hn`| `pk_live_0PB2cijPrjvgdB4sRItAGs8s00vj5uwDTc`|

## Contacts

Splitty Pay is willing to help you about everything you need to know regards became a partner.  
For any other information, please enquire to supporto@splittypay.com
