import React from "react";
import { v1 as uuid } from "uuid";
import './CreateRoom.css';

const CreateRoom = (props) => {
    
    function create() {
        const id = uuid();
        props.history.push(`/room/${id}`);
    }

    return (
        <div className="create_room_container">
            <button onClick={create}>Create room</button>
        </div>
    );
};

export default CreateRoom;