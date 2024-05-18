document.addEventListener("DOMContentLoaded", function() {
    // Target UNIX time (1718755230)
    const targetTime = 1718755230;
    
    // Get the current UNIX time
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Calculate the difference in seconds
    const timeDifference = targetTime - currentTime;
    
    // Convert the difference to days
    const daysRemaining = Math.ceil(timeDifference / (60 * 60 * 24));
    
    // Find the element with the class "days"
    const daysElement = document.querySelector(".days");
    
    /*Debugging: Log the values to the console
    console.log("Current Time:", currentTime);
    console.log("Target Time:", targetTime);
    console.log("Time Difference (seconds):", timeDifference);
    console.log("Days Remaining:", daysRemaining);
    */
    
    // Update the text content if the element exists
    if (daysElement) {
        daysElement.textContent = `${daysRemaining} Days`;
    } else {
        console.error("Element with class 'days' not found.");
    }
});