import { Request, Response, NextFunction } from "express";
const axios = require("axios").default;
const ApiError = require("../error/ApiError.ts");

class BluetoothController {
  async getAllDevices(req: Request, res: Response, next: NextFunction) {}
  async connectDevice(req: Request, res: Response, next: NextFunction) {}
  async disconnectDevice(req: Request, res: Response, next: NextFunction) {}
  async bindNextButton(req: Request, res: Response, next: NextFunction) {}
  async dropKeys(req: Request, res: Response, next: NextFunction) {}
  async dropSetKeys(req: Request, res: Response, next: NextFunction) {}
}

module.exports = new BluetoothController();
