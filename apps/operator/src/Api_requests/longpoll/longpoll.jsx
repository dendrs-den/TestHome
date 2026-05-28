import coreBaseUrl from "../coreBaseUrl";

class Longpoll {
  constructor() {
    this.subcribers = new Map();

    this.Subscribe = async (type, func, uid = "default") => {
      try {
        if (!this.ready) {
          await this.Start();
        }
        if (!(await this.ready)) return false;

        if (!this.subcribers.has(type)) {
          fetch(`${coreBaseUrl}/lp/tune`, {
            method: "POST",
            body: JSON.stringify({ id: this.id, newEventType: type }),
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((result) => result.json())
            .then((json) => {
              if (json["status"] === "OK") {
                this.subcribers.set(type, new Map());
                this.subcribers.get(type).set(uid, func);
              }
            });
        } else {
          this.subcribers.get(type).set(uid, func);
        }
        return true;
      } catch (error) {
        console.log("1. Log error on POST /lp/tune :>> ", error);
      }
    };

    this.Loop = async () => {
      fetch(`${coreBaseUrl}/lp/loop`, {
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
              this.subcribers.get(eventType).forEach((subcriber) => subcriber(eventBody));
            });
            this.Polling(1);
          } else {
            this.Polling(5000);
          }
        })
        .catch((error) => {
          console.log("1. Log error on POST /lp/loop :>> ", error);
          this.Polling(5000);
        });
    };

    this.Polling = (interval) => {
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.Loop, interval);
    };
  }

  async Start() {
    try {
      // eslint-disable-next-line no-async-promise-executor
      this.ready = new Promise(async (resolve) => {
        const result = await fetch(`${coreBaseUrl}/lp/start`, {
          method: "POST",
          body: JSON.stringify({ timeout: 1000, maxEvents: 200 }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (result.status === 200) {
          const json = await result.json();
          this.id = json["id"];
          this.lpi = json["lpi"];

          resolve(true);

          this.Polling(1);
        }

        resolve(false);
      });
    } catch (error) {
      this.ready = Promise.resolve(false);
    }
  }
}

const lp = new Longpoll();
export default lp;
