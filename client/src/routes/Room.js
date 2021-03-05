import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import {BsMicFill, BsMicMuteFill, BsCameraVideo} from 'react-icons/bs';
import {BiVideoOff} from 'react-icons/bi';

const Container = styled.div`
    padding: 0px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
    background:#333;
`;

const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
    border:1px solid #00b1b1;
`;

const ActionBtn = styled.div`
    border: none;
    font-size: 3rem;
    color: #fff;
    display:flex;
    justify-content:center;
    align-items:center;
`

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
        <>
            <StyledVideo autoPlay playsInline ref={ref} />
            <ActionBtn>{muted ? <BsMicMuteFill/> : <BsMicFill/>}</ActionBtn>
            <ActionBtn>{vidMute ? <BiVideoOff/> : <BsCameraVideo/>}</ActionBtn>
        </>

    );
}


const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userVideo.current.srcObject = stream;
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
        })
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

    return (
        <Container>
            <StyledVideo muted ref={userVideo} autoPlay playsInline />
            {peers.map((peer, index) => (
                <Video key={index} peer={peer} />  
            ))}
        </Container>
    );
};

export default Room;