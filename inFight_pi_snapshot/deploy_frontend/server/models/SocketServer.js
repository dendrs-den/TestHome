const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const port = process.env.WEBSOCKET_SERVER_PORT || 3002;

class SocketServer {
  constructor(app) {
    const httpServer = createServer(app);

    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });

    httpServer.listen(port);
    this.onConnection();
  }

  onConnection() {
    this.io.on("connection", (socket) => {
      SocketServer.sockets.set(socket.id, socket);
      this.setListeners(socket);
    });
  }

  setListeners(socket) {
    socket.on("test-from-client", (data) => {
      console.log(data);
      return data;
    });
    socket.on("disconnect", (reason) => {
      SocketServer.sockets.delete(socket.id);
      // console.log(reason, [...SocketServer.sockets.keys()]);
    });
    socket.on("all_params_ok", (reason) => {
      console.log("received all params ok");

      SocketServer.getSockets().forEach((socket) => {
        socket.emit("all_params_ok");
      });
    });
  }

  static getSockets() {
    return [...SocketServer.sockets.values()];
  }
}

SocketServer.sockets = new Map();

module.exports = SocketServer;
