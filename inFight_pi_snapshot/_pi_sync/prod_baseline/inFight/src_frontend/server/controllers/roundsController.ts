import { Request, Response, NextFunction } from "express";
const ApiError = require("../error/ApiError.ts");
const URL = process.env.CORE_API_URL;
const $host = require("./index");

class RoundsController {
  async getRoundInfo(req: Request, res: Response, next: NextFunction) {}

  async getCurrentRound(req: Request, res: Response, next: NextFunction) {}

  async saveRound(req: Request, res: Response, next: NextFunction) {}

  async getLastRound(req: Request, res: Response, next: NextFunction) {}

  async startRound(req: Request, res: Response, next: NextFunction) {}

  async startRoundRemotely(req: Request, res: Response, next: NextFunction) {}

  async endRound(req: Request, res: Response, next: NextFunction) {}

  async endRoundRemotely(req: Request, res: Response, next: NextFunction) {}

  async replayRound(req: Request, res: Response, next: NextFunction) {}

  async setNextRound(req: Request, res: Response, next: NextFunction) {}

  async swapRoundPositions(req: Request, res: Response, next: NextFunction) {}

  async updateRoundsTeam(req: Request, res: Response, next: NextFunction) {}
}

module.exports = new RoundsController();
