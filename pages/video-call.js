import React, { Component } from 'react'
import io from 'socket.io-client'
import _ from 'lodash'

import style from '~/pagesStyle/VideoCall.scss'


class VideoManager extends Component{
	constructor (props) {
		super(props)
		this.state = {
			socket: null,
			msg: '',
			chatMsgs: [],
			socketIds: [],
			peerConnection: null,
			isAlreadyCalling: false
		}
	}
	componentDidMount () {
		const peerConnection = new RTCPeerConnection()
		const socket = io()
		this.setState({socket})
		socket.on('chat message', (msg) => {
			this.setState((state)=>{
				state.chatMsgs = [ ...state.chatMsgs, {name:'user', msg}]
				return { ...state }
			})
		})

		socket.on("update-user-list", ({ users }) => {
			this.updateUserList(users);
		})

		socket.on("remove-user", ({ socketId }) => {
			this.setState( state => {
				state.socketIds = _.remove(state.socketIds, item => item === socketId)
				return { ...state }
			})
		})
		socket.on("call-made", async data => {
			await peerConnection.setRemoteDescription(
				new RTCSessionDescription(data.offer)
			)

			const answer = await peerConnection.createAnswer()
			await peerConnection.setLocalDescription(new RTCSessionDescription(answer))

			socket.emit("make-answer", {
				answer,
				to: data.socket
			})
		})

		socket.on("answer-made", async data => {
			await peerConnection.setRemoteDescription(
				new RTCSessionDescription(data.answer)
			)

			if (!this.state.isAlreadyCalling) {
				this.callUser(data.socket);
				this.setState({isAlreadyCalling: true})
			}
		})

		peerConnection.ontrack = function({ streams: [stream] }) {
			const remoteVideo = document.getElementById("remote-video")
			if (remoteVideo) {
				console.log(stream)
				remoteVideo.srcObject = stream
			}
		}

		this.setState({peerConnection})
		this.showLocalVideo(peerConnection)
	}
	render () {
		return (
				<div className="video-manager">
					<div className="active-users-panel">
						<h3 className="panel-title">Active Users:</h3>
						<div className="sockets">
							{
								this.state.socketIds.map((item, key) => (
									<div
										className="active-user"
										id={item}
										key={key}
										onClick={() => {this.callUser(item)}}
									>
										<p className="username">{item}</p>
									</div>
								))
							}
						</div>
					</div>
					<div className="communication-container">
						<div className="video-container">
							<video autoPlay className="remote-video" id="remote-video"></video>
							<video autoPlay muted className="local-video" id="local-video"></video>
						</div>
						<div className="chat-container">
							<div className="msg_block">
								{
									this.state.chatMsgs.map((item, key) => (
										<div className="msg_item" key={key}>
											<div className="msg_user-name">
												{item.name}:
											</div>
											<div className="msg_user-msg">
												{item.msg}
											</div>
										</div>
									))
								}
							</div>
							<div className="msg-entry-field">
								<form onSubmit={this.onSubmit}>
									<input
										type="text"
										name="msg"
										value={this.state.msg}
										onChange={this.handleInputChange}
										className="msg-input"
									/>
									<button type="submit" className="msg-submit">Отправить</button>
								</form>
							</div>
						</div>
					</div>
					<style jsx>{style}</style>
				</div>
		)
	}
	async callUser(socketId) {
		const { peerConnection } = this.state
		const offer = await peerConnection.createOffer()
		await peerConnection.setLocalDescription(new RTCSessionDescription(offer))

		this.state.socket.emit("call-user", {
			offer,
			to: socketId
		})
	}
	updateUserList = (socketIds) => {
		this.setState( state => {
			state.socketIds = _.union(state.socketIds, socketIds)
			return { ...state }
		})
	}
	handleInputChange = (e) => {
		const target = e.target;
		const value = target.name === 'isGoing' ? target.checked : target.value;
		const name = target.name;
	
		this.setState({
			[name]: value
		});
	}
	onSubmit = (e) => {
		e.preventDefault()
		const { socket, msg } = this.state
		if(socket !== null && msg !== ''){ socket.emit('chat message', msg)}

		this.setState({msg: ''})
	}
	showLocalVideo = (peerConnection) => {
		const localVideo = document.getElementById("local-video")
		const constraints = { video: { facingMode: "user" }, audio: true }

		// if( navigator.getUserMedia ){
		// 	navigator.getUserMedia(constraints,
		// 		stream => {
		// 			if (localVideo) {
		// 				localVideo.srcObject = stream;
		// 			}

		// 			stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
		// 		},
		// 		error => {
		// 			console.warn(error.message)
		// 		})

		// 	return
		// }
		// if( navigator.mediaDevices.getUserMedia ){
			navigator.mediaDevices.getUserMedia(constraints)
				.then(
					stream => {
						if (localVideo) {
							localVideo.srcObject = stream;
						}
	
						stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
					}
				)
				.catch(error => {
					console.warn(error.message)
				})
			return
		// }
	}
}

export default VideoManager