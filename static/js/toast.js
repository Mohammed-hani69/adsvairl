// Toast notification functions
function showSuccessToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "center",
        style: {
            background: "#48bb78",
            borderRadius: "0.5rem"
        },
        className: "rtl",
    }).showToast();
}

function showErrorToast(message) {
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "center",
        style: {
            background: "#f56565",
            borderRadius: "0.5rem"
        },
        className: "rtl",
    }).showToast();
}
