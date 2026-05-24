import { Request, Response, NextFunction } from "express";
const ApiError = require("../error/ApiError.ts");
const URL = process.env.CORE_API_URL;
const $host = require("./index");

class TeamsController {
  async getById(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    console.log(id);
    const { data } = await $host.get("/team/", { data: { id: id } });

    if (!data) {
      return next(ApiError.internal("Error getting team by id"));
    }
    res.json(data);
  }
  async create(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { data } = await $host.get("/team", { data: { id: id } });

    if (!data) {
      return next(ApiError.internal("Error deleting current tournament"));
    }
    res.json(data);
  }
  async delete(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { data } = await $host.get("/team", { data: { id } });

    if (!data) {
      return next(ApiError.internal("Error deleting current tournament"));
    }
    res.json(data);
  }
  async update(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { data } = await $host.get("/team", { data: { id } });

    if (!data) {
      return next(ApiError.internal("Error deleting current tournament"));
    }
    res.json(data);
  }
}

module.exports = new TeamsController();
