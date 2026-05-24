import { io } from "socket.io-client";

const WEBSOCKET_URL =
  // eslint-disable-next-line no-undef
  process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:3002`;

export default class SpectatorSocket {
  static socket = null;

  static getInstance() {
    if (this.socket == null) {
      this.socket = new SpectatorSocket();
    }
    return this.socket;
  }

  constructor(){
    this.socket = io(`${WEBSOCKET_URL}`,{
    'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionDelayMax' : 5000,
    'reconnectionAttempts': 5});
    this.tour = {
      name: "",
      skipCount: 0,
      bustCount: 0,
    };
    this.setListeners();
  }


  setListeners() {
    console.log("setListeners")
    this.socket.on("current_tournament", (data) => {
      this.setTour(data);

      return data;
    });

    // eslint-disable-next-line no-undef
    this.socket.on("bust", (data) => {
      return data;
    });

    // eslint-disable-next-line no-undef
    this.socket.on("skip", (data) => {
      return data;
    });

    // eslint-disable-next-line no-undef
    this.socket.on("last_round", (data) => {
      return data;
    });
  }

  returnTour() {
    return this.tour;
  }

  setTour(val) {
    this.tour = val;
  }

  emit(channel, data) {
    // eslint-disable-next-line no-undef
    this.socket.emit(channel, data);
  }
}
