import React, {useState, useRef, useEffect} from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import styled from 'styled-components';


const Container = styled.div`
    padding:20px;
    display:flex;
    height:100vh;
    width:90%;
    margin:auto;
    flex-wrap:wrap;
`

const StyledVideo = styled.video`
    height:45%;
    width:50%;
`

const Video = props => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    // eslint-disable-next-line 
    },[]);

    return(
        <StyledVideo playsInline autoPlay ref={ref} />
    );
}

const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
}


export const Room = props => {
    const [peers, set_peers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef();
    const roomId = props.match.params.roomId;

    useEffect(() => {
        socketRef.current = io.connect('/');
        navigator.mediaDevices.getUserMedia({video:videoConstraints, audio:true})
            .then(stream => {
                userVideo.current.srcObject = stream;
                socketRef.current.emit("join room", roomId);
                socketRef.current.on("all users", users => {
                    const peers = [];
                    users.forEach(userId => {
                        const peer = createPeer(userId, socketRef.current.id, stream);
                        peersRef.current.push({
                            peerId: userId,
                            peer,
                        })
                        peers.push(peer);
                    })
                    set_peers(peers);
                })


                socketRef.current.on("user joined", payload => {
                    const peer = addPeer(payload.signal, payload.callerId, stream);
                    peersRef.current.push({
                        peerId: payload.callerId,
                        peer,
                    })

                    set_peers(users => [...users, peer])
                })

                socketRef.current.on("receiving returned signal", payload => {
                    const item = peersRef.current.find(p => p.peerId === payload.id);
                    item.peer.signal(payload.signal);
                });
            });
    // eslint-disable-next-line 
    },[]);

    const createPeer = (userToSignal, callerId, stream) => {
        const peer = new Peer({
            initiator:true,
            trickle:false,
            stream,
        })

        peer.on("singal", signal => {
            socketRef.current.emit("sending signal", {userToSignal, callerId, signal})
        })

        return peer;
    }

    const addPeer = (incomingSignal, callerId, stream) => {
        const peer = new Peer({
            initiator:false,
            trickle:false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", {signal, callerId})
        })

        peer.signal(incomingSignal)

        return peer;
    }

    return(
        <Container>
            <StyledVideo muted ref={userVideo} autoPlay playsInline />
            {peers.map((peer, index) => {
                return(
                    <Video key={index} peer={peer} />
                )
            })}
        </Container>
    )
}