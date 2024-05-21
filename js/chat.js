// script.js
document.getElementById('dmButton').addEventListener('click', function() {
    document.getElementById('chatForm').style.display = 'block';
    document.getElementById('dmButton').style.display = 'none';
    document.getElementById('emailInput').focus();
});

document.getElementById('submitEmail').addEventListener('click', function() {
    const emailInput = document.getElementById('emailInput');
    const emailError = document.getElementById('emailError');
    const email = emailInput.value;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (emailPattern.test(email)) {
        emailError.textContent = '';
        document.getElementById('emailSection').style.display = 'none';
        document.getElementById('messageSection').style.display = 'block';
        document.getElementById('messageInput').focus();
    } else {
        emailError.textContent = 'Please enter a valid email address.';
    }
});

document.getElementById('chatForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;

    if (message.trim() !== '') {
        sendEmail(message);
        messageInput.value = '';
        alert('Message sent!');
    }
});

function sendEmail(message) {
    const email = document.getElementById('emailInput').value;
    fetch('/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            to: 'chat@tylerpixel.com',
            subject: `New message from ${email}`,
            text: message
        })
    });
}
