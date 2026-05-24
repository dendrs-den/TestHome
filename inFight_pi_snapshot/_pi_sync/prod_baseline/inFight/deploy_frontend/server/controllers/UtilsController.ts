import { Request, Response, NextFunction } from "express";

class UtilsController {
  async getIp(req: Request, res: Response, next: NextFunction) {}
}

module.exports = new UtilsController();
