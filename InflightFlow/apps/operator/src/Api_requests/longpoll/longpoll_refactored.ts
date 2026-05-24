class Longpoll {
  private subscribers: Map<string, any>;
  private ready: Promise<any>;
  private id: number;
  private lpi: number;
  private timeout: NodeJS.Timeout;

  constructor() {
    this.start();
    this.subscribers = new Map();
  }

  async start() {
    try {
      // eslint-disable-next-line no-async-promise-executor
      this.ready = new Promise(async (resolve, reject) => {
        const result = await fetch("/lp/start", {
          method: "POST",
          body: JSON.stringify({ timeout: 1000, maxEvents: 200 }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (result.status === 200) {
          const json = await result.json();

          this.id = json.id;
          this.lpi = json.lpi;

          resolve(true);

          this.polling(1);
        }

        reject();
      });
    } catch (error) {
      console.log("Log error /lp/start request failed", error);
    }
  }

  async subscribe(type, func, uid = "default") {
    try {
      if (!(await this.ready)) return false;

      if (!this.subscribers.has(type)) {
        fetch("/lp/tune", {
          method: "POST",
          body: JSON.stringify({ id: this.id, newEventType: type }),
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((result) => result.json())
          .then((json) => {
            if (json["status"] === "OK") {
              this.subscribers.set(type, new Map());
              this.subscribers.get(type).set(uid, func);
            }
          });
      } else {
        this.subscribers.get(type).set(uid, func);
      }

      return true;
    } catch (error) {
      console.log("Log error /lp/tune request failed", error);
    }
  }

  async polling(interval: number) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.loop, interval);
  }

  async loop() {
    try {
      fetch("/lp/loop", {
        method: "POST",
        body: JSON.stringify({ id: this.id, lpi: this.lpi }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((result) => result.json())
        .then((json) => {
          if (json["status"] === "OK") {
            this.lpi = json["lpi"];
            json["events"].forEach((event) => {
              const eventType = event["type"];
              const eventBody = event["data"];
              this.subscribers.get(eventType).forEach((Subscriber) => Subscriber(eventBody));
            });
            this.polling(1);
          } else {
            this.polling(5000);
          }
        })
        .catch((error) => {
          this.polling(5000);
        });
    } catch (error) {
      console.log("Log error /lp/loop request failed", error);
    }
  }
}
const lp = new Longpoll();

export default lp;
