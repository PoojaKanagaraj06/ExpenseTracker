document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');

    // Handle Signup Form Submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const response = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();
            document.getElementById('signupmessage').textContent = data.message;

            if (response.ok) {
                // Store user details in localStorage
                const users = JSON.parse(localStorage.getItem('users')) || {};
                users[email] = name; // Map email to name
                localStorage.setItem('users', JSON.stringify(users)); // Save updated users object
                window.location.href = 'login.html';
            }
        });
    }

    // Handle Login Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            document.getElementById('loginmessage').textContent = data.message;

            if (response.ok) {
                // Retrieve users from localStorage
                const users = JSON.parse(localStorage.getItem('users')) || {};

                

                // Check if the email exists in the stored users
                if (users[email]) {
                    localStorage.setItem('username', users[email]); // Save the username
                    window.location.href = 'mainpage.html';
                } else {
                    document.getElementById('loginmessage').textContent = 'No user found for this email';
                }
            }
        });
    }

    // Display Username on Main Page
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        const username = localStorage.getItem('username');
        
        if (username) {
            usernameElement.textContent = username;
        } else {
            window.location.href = 'login.html'; // Redirect if no username is found
        }
    }
});
