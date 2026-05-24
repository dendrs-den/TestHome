const { createLogger, transports, format } = require('winston');
const { combine, timestamp, label, printf } = format; 

class Logger {
  static instance = null;

  static createInstance() {
    Logger.instance = createLogger({
      level: 'info',
      format: Logger.logFormat(),
      defaultMeta: { service: 'user-servive'},
      transports:[
        new transports.File({filename: 'error.log', level:'error'}),
        new transports.File({filename: 'combined.log'}),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      Logger.instance.add(new transports.Console({
        format: format.simple(),
      }));
    }
  }

  static logFormat() {
    return combine(

      timestamp(),
      printf(({ level, message, label, timestamp }) => {
        return `${timestamp} ${level}: ${message}`;
      })
    );
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.createInstance();
    }

    return Logger.instance;
  }
}

module.exports = Logger;