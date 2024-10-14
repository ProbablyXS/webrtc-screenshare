const socket = io();
let localStream;
let remoteStream;
let peerConnection;
let remoteAudioMuted = false; 

const roomInput = document.getElementById('roomInput');
const joinRoomButton = document.getElementById('joinRoom');
const videoContainer = document.getElementById('videoContainer');
const volumeControl = document.getElementById('volumeControl');
const remoteVideo = document.getElementById('remoteVideo');

// Public ICE servers configuration (Google STUN server and a few others)
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },  // Google's STUN server
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};

joinRoomButton.onclick = () => {
    const roomName = roomInput.value;
    if (roomName) {
        socket.emit('joinRoom', roomName);
        document.getElementById('chat').innerHTML += `<div>Joined room: ${roomName}</div>`;
        roomInput.disabled = true;
        joinRoomButton.disabled = true;
    }
};

async function startScreenShare() {
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
                noiseSuppression: false,
                echoCancellation: false
            }
        });
        document.getElementById('localVideo').srcObject = localStream;

        peerConnection = new RTCPeerConnection(iceServers);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('iceCandidate', { candidate: event.candidate, room: roomInput.value });
            }
        };

        peerConnection.ontrack = event => {
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
            updateVolumeControl();
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { sdp: offer.sdp, room: roomInput.value });
    } catch (error) {
        console.error('Error during screen share:', error);
    }
}

socket.on('offer', async (data) => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(iceServers);
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('iceCandidate', { candidate: event.candidate, room: roomInput.value });
            }
        };

        peerConnection.ontrack = event => {
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
        };
    }

    console.log('Received offer:', data.sdp);
    
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        console.log('Sending answer:', answer.sdp);
        socket.emit('answer', { sdp: answer.sdp, room: roomInput.value });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (data) => {
    console.log('Received answer:', data.sdp);
    
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
    } catch (error) {
        console.error('Error setting remote description:', error);
    }
});

socket.on('iceCandidate', (data) => {
    const candidate = new RTCIceCandidate(data.candidate);
    peerConnection.addIceCandidate(candidate)
        .catch(error => console.error('Error adding received ice candidate:', error));
});

document.getElementById('startShare').onclick = startScreenShare;

document.getElementById('stopShare').onclick = () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
};

// Mute/Unmute local audio
document.getElementById('mute').onclick = () => {
    localStream.getAudioTracks().forEach(track => track.enabled = false);
    console.log('Local audio muted');
};

document.getElementById('unmute').onclick = () => {
    localStream.getAudioTracks().forEach(track => track.enabled = true);
    console.log('Local audio unmuted');
};

// Mute/Unmute remote audio
document.getElementById('muteRemote').onclick = () => {
    if (remoteStream) {
        remoteStream.getAudioTracks().forEach(track => {
            track.enabled = false;
        });
        remoteAudioMuted = true;
        console.log('Remote audio muted');
    }
};

document.getElementById('unmuteRemote').onclick = () => {
    if (remoteStream) {
        remoteStream.getAudioTracks().forEach(track => {
            track.enabled = true;
        });
        remoteAudioMuted = false;
        console.log('Remote audio unmuted');
    }
};

// Volume Control Slider
volumeControl.oninput = () => {
    const volume = parseFloat(volumeControl.value); 
    remoteVideo.volume = volume;
    const percentage = Math.round(volume * 100); 
    document.getElementById('volumePercentage').textContent = `${percentage}%`; 
    console.log('Set remote audio volume:', volume);
};

// Fullscreen toggle
document.getElementById('fullscreenToggle').onclick = () => {
    if (remoteVideo.requestFullscreen) {
        remoteVideo.requestFullscreen();
    } else if (remoteVideo.webkitRequestFullscreen) { 
        remoteVideo.webkitRequestFullscreen();
    } else if (remoteVideo.msRequestFullscreen) { 
        remoteVideo.msRequestFullscreen();
    }
};

// Chat functionality
document.getElementById('sendMessage').onclick = () => {
    const message = document.getElementById('messageInput').value;
    socket.emit('chatMessage', { message, room: roomInput.value });
    document.getElementById('chat').innerHTML += `<div>${message}</div>`;
};

socket.on('chatMessage', (data) => {
    document.getElementById('chat').innerHTML += `<div>${data.message}</div>`;
});
