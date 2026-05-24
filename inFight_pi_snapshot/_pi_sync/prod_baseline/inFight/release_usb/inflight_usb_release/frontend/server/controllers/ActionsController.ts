import { Request, Response, NextFunction } from "express";
const axios = require("axios").default;
const ApiError = require("../error/ApiError.ts");

class ActionController {
  async sendBust(req: Request, res: Response, next: NextFunction) {}
  async sendSkip(req: Request, res: Response, next: NextFunction) {}
  async sendFaultRemotely(req: Request, res: Response, next: NextFunction) {}
  async waitRemoteFault(req: Request, res: Response, next: NextFunction) {}
  async getState(req: Request, res: Response, next: NextFunction) {}
  async setAdministration(req: Request, res: Response, next: NextFunction) {}
  async setPrepare(req: Request, res: Response, next: NextFunction) {}
  async getAllFaults(req: Request, res: Response, next: NextFunction) {}
  async getAllCrosses(req: Request, res: Response, next: NextFunction) {}
  async editFaults(req: Request, res: Response, next: NextFunction) {}
  async editCrosses(req: Request, res: Response, next: NextFunction) {}
  async waitCross(req: Request, res: Response, next: NextFunction) {}
  async getHistory(req: Request, res: Response, next: NextFunction) {}
}

module.exports = new ActionController();
