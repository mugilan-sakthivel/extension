console.log("Auth content script loaded on extension-success page");

// Function to fetch user session from the backend using cookies
async function fetchUserSession() {
    try {
        console.log("Fetching user session from backend...");

        // The cookies are automatically sent with this fetch request
        // because we have host_permissions for localhost:5173
        const response = await fetch('http://localhost:5173/api/auth/get-session', {
            credentials: 'include' // Include cookies in the request
        });

        if (!response.ok) {
            console.error("Failed to fetch session:", response.status);
            // Retry after a delay
            setTimeout(fetchUserSession, 1000);
            return;
        }

        const data = await response.json();
        console.log("Session data from backend:", data);

        if (data.session && data.user) {
            const user = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email
            };

            console.log("Found user session, sending to background:", user);

            // Notify background script that login was successful
            chrome.runtime.sendMessage({
                action: "loginSuccess",
                user: user
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    return;
                }
                console.log("Login success message sent to background", response);
            });
        } else {
            console.log("No session found, retrying in 1 second...");
            setTimeout(fetchUserSession, 1000);
        }
    } catch (error) {
        console.error("Error fetching session:", error);
        setTimeout(fetchUserSession, 1000);
    }
}

// Start fetching user session
fetchUserSession();