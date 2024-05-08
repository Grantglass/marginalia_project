// client.js

// This function is called when an image is clicked
function onImageClick(imageId) {
    // Send a GET request to the server to get the transcriptions for the selected image
    fetch(`/transcriptions/${imageId}`)
        .then(response => response.json())
        .then(transcriptions => {
            // Now you have the transcriptions for the selected image
            // You can display them on the page in any way you want
            displayTranscriptions(transcriptions);
        });
}

// This function displays the transcriptions on the page
function displayTranscriptions(transcriptions) {
    // This is just a placeholder - replace it with your actual code
    console.log(transcriptions);
}