const app = require('express')()
const server = require('http').Server(app)
const next = require('next')
const bodyParser = require('body-parser')
const io = require('socket.io')(server)

const dev = process.env.NODE_ENV !== 'production'
const nextApp = next({ dev })
const handle = nextApp.getRequestHandler()

let activeSockets = []

// socket.io server
io.on('connection', socket => {
	const existingSocket = activeSockets.find(
		existingSocket => existingSocket === socket.id
	)

	if (!existingSocket) {
		activeSockets = [ ...activeSockets, socket.id ]

		socket.emit("update-user-list", {
			users: activeSockets.filter(
				existingSocket => existingSocket !== socket.id
			)
		})

		socket.broadcast.emit("update-user-list", {
			users: [socket.id]
		})
	}

	socket.on("disconnect", () => {
		activeSockets = activeSockets.filter(
			existingSocket => existingSocket !== socket.id
		)
		socket.broadcast.emit("remove-user", {
			socketId: socket.id
		})
	})

	socket.on("call-user", data => {
		socket.to(data.to).emit("call-made", {
			offer: data.offer,
			socket: socket.id
		})
	})

	socket.on("make-answer", data => {
		socket.to(data.to).emit("answer-made", {
			socket: socket.id,
			answer: data.answer
		})
	})
})

nextApp.prepare().then(() => {
	app.use(bodyParser.json())

	app.get('*', (req, res) => {
		return handle(req, res)
	})

	server.listen(3000, (err) => {
		if (err) throw err
		console.log('> Read on http://localhost:3000')
	})
})