import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import {BsMicFill, BsMicMuteFill, BsCameraVideo} from 'react-icons/bs';
import {BiVideoOff} from 'react-icons/bi';
import './Room.css';

const Video = (props) => {
    //eslint-disable-next-line
    const [muted, set_muted] = useState(false)
    //eslint-disable-next-line
    const [vidMute, set_vidMute] = useState(false)
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
        //eslint-disable-next-line
    }, []);

    return (
        <video autoPlay playsInline ref={ref}></video>
    );
}


const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const Room = (props) => {
    //eslint-disable-next-line
    const [micMute, set_micMute] = useState(false);
    //eslint-disable-next-line
    const [vidMute, set_vidMute] = useState(false);
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
            console.log(userVideo)
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", users => {
                const peers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push(peer);
                })
                setPeers(peers);
            })

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })

                setPeers(users => [...users, peer]);
            });

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        });
    //eslint-disable-next-line
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    const togglMute = () => {
        set_micMute(prev => prev ? false : true)
        userVideo.current.srcObject.getAudioTracks()[0].enabled = !(userVideo.current.srcObject.getAudioTracks()[0].enabled);      
    }

    const toggleVideo = () => {
        set_vidMute(prev => prev ? false : true)
        userVideo.current.srcObject.getVideoTracks()[0].enabled = !(userVideo.current.srcObject.getVideoTracks()[0].enabled);
    }

    return (
        <div className="app_container">
            {/* Users own video */}
            <video className="self_video" muted ref={userVideo} autoPlay playsInline></video>
            {/* End of users Own video */}

            {/* Peer connection streams */}
            <div className="other_video_container">            
                {peers.map((peer, index) => (
                    <Video key={index} peer={peer} />  
                ))}
            </div>
            {/* End of peer connection streams */}

            {/* Buttons Group */}
            <div className="action_buttons">
                <div 
                    title="Toggle Mute" 
                    onClick={togglMute} 
                    className="mute_btn">
                    {micMute ? <BsMicMuteFill/> : <BsMicFill/> }
                </div>
                <div 
                    title="Toggle video" 
                    onClick={toggleVideo} 
                    className="vid_btn">
                    {vidMute ? <BiVideoOff/> : <BsCameraVideo /> }
                </div>
            </div>
            {/* End of Buttons group */}

        </div>
    )
}

export default Room