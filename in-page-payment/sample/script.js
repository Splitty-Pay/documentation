var stripe;

const orderData = {
    cart: 'cartId',
};

document.querySelector("button").disabled = true;


fetch("https://sandbox.splittypay.it/MerchantCart/create-payment", { //make a call to your BackEnd API
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(orderData)
})
    .then(function(result) {
        return result.json();
    })
    .then(function(data) {
        return setupElements(data);
    })
    .then(function({ stripe, card, clientSecret }) {
        document.querySelector("button").disabled = false;

        // Handle form submission.
        const form = document.getElementById("payment-form");
        form.addEventListener("submit", function(event) {
            event.preventDefault();
            // Initiate payment when the submit button is clicked
            pay(stripe, card, clientSecret);
        });
    });

const setupElements = function(data) {
    stripe = Stripe(data.publicKey);
    const elements = stripe.elements();
    const style = {
        base: {
            color: "#32325d",
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: "antialiased",
            fontSize: "16px",
            "::placeholder": {
                color: "#aab7c4"
            }
        },
        invalid: {
            color: "#fa755a",
            iconColor: "#fa755a"
        }
    };

    const card = elements.create("card", {style: style, hidePostalCode: true});
    card.mount("#card-element");

    return {
        stripe: stripe,
        card: card,
        clientSecret: data.clientSecret
    };
};

/*
 * Calls stripe.confirmCardPayment which creates a pop-up modal to
 * prompt the user to enter extra authentication details without leaving your page
 */
const pay = function(stripe, card, clientSecret) {
    changeLoadingState(true);

    // Initiate the payment.
    // If authentication is required, confirmCardPayment will automatically display a modal
    stripe
        .confirmCardPayment(clientSecret, {
            payment_method: {
                card: card
            },
            setup_future_usage: 'off_session' //set this value only if you want to save the PaymentMethod information
        })
        .then(function(result) {
            if (result.error) {
                // Show error to your customer
                showError(result.error.message);
            } else {
                // The payment has been processed!
                orderComplete(clientSecret);
            }
        });
};


// Show a spinner on payment submission
const changeLoadingState = function(isLoading) {
    if (isLoading) {
        document.querySelector("button").disabled = true;
        document.querySelector("#spinner").classList.remove("hidden");
        document.querySelector("#button-text").classList.add("hidden");
    } else {
        document.querySelector("button").disabled = false;
        document.querySelector("#spinner").classList.add("hidden");
        document.querySelector("#button-text").classList.remove("hidden");
    }
};
/* Shows a success / error message when the payment is complete */
const orderComplete = function(clientSecret) {
    stripe.retrievePaymentIntent(clientSecret).then(function(result) {
        const paymentIntent = result.paymentIntent;
        const paymentIntentJson = JSON.stringify(paymentIntent, null, 2);

        document.querySelector(".sr-payment-form").classList.add("hidden");
        document.querySelector("pre").textContent = paymentIntentJson;

        document.querySelector(".sr-result").classList.remove("hidden");
        setTimeout(function() {
            document.querySelector(".sr-result").classList.add("expand");
        }, 200);

        changeLoadingState(false);
    });
};

/* ------- Post-payment helpers ------- */
const showError = function(errorMsgText) {
    changeLoadingState(false);
    var errorMsg = document.querySelector(".sr-field-error");
    errorMsg.textContent = errorMsgText;
    setTimeout(function() {
        errorMsg.textContent = "";
    }, 4000);
};

