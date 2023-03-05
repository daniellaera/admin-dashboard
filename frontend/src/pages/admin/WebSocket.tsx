import { useState } from "react";
import { io } from "socket.io-client";

//const socket = io.connect(`ws://localhost:8080/api/v1/websocket`, { transports: ["websocket"] });
const socket = io("http://localhost:8080");

const WebSocket = () => {
    const [task, setTask] = useState("");
	const userId = localStorage.getItem("1");

	const handleAddTodo = (e: any) => {
		e.preventDefault();
        socket.emit("createTask", { task, userId });
        setTask("");
		
	};
    return (
        <form className='form__input' onSubmit={handleAddTodo}>
			<label htmlFor='task'>Add Todo</label>
			<input
				type='text'
				name='task'
				id='task'
				value={task}
				className='input'
				required
				onChange={(e) => setTask(e.target.value)}
			/>
			<button className='addTodoBtn'>ADD TODO</button>
		</form>
    )
}

export default WebSocket