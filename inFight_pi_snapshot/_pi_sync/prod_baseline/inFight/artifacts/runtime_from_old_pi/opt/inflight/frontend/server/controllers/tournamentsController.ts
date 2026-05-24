import { Request, Response, NextFunction } from "express";
const axios = require("axios").default;
const ApiError = require("../error/ApiError.ts");
const URL = process.env.CORE_API_URL;
const $host = require("./index");

class TournamentController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    const { data } = await $host.get("/tournament/all");

    if (!data) {
      return next(ApiError.internal("Error receiving all tournaments"));
    }
    res.json(data);
  }

  async getCurrent(req: Request, res: Response, next: NextFunction) {
    const { data } = await $host.get("/tournament/current");

    if (!data) {
      return next(ApiError.internal("Error receiving current tournament"));
    }
    res.json(data);
  }
  async setCurrent(req: Request, res: Response, next: NextFunction) {
    const { id } = req.body;
    const { data } = await $host.post("/tournament/current", { data: { id } });

    if (!data) {
      return next(ApiError.internal("Error receiving current tournament"));
    }
    res.json(data);
  }

  async create(req: Request, res: Response, next: NextFunction) {
    const { name, teams, disciplines, stages, bust_value, skip_value } =
      req.body;

    const { data } = await $host.post("/tournament/add", {
      name,
      teams,
      disciplines,
      stages,
      bust_value,
      skip_value,
    });

    if (!data) {
      return next(ApiError.internal("Error while creating tournament"));
    }
    res.json(data);
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    const { id } = req.body;
    const { data } = await $host.post("/tournament/delete", { data: { id } });

    if (!data) {
      return next(ApiError.internal("Error deleting current tournament"));
    }
    res.json(data);
  }

  async update(req: Request, res: Response, next: NextFunction) {
    const { data } = await $host.post("/tournament/update", { data: req.body });

    if (!data) {
      return next(ApiError.internal("Error deleting current tournament"));
    }
    res.json(data);
  }

  async updateCurrent(req: Request, res: Response, next: NextFunction) {
    const { data } = await $host.post("/tournament/current/update", {
      data: req.body,
    });

    if (!data) {
      return next(ApiError.internal("Error deleting current tournament"));
    }
    res.json(data);
  }

  async training(req: Request, res: Response, next: NextFunction) {
    const { data } = await $host.post("/tournament/test");

    if (!data) {
      return next(ApiError.internal("Error deleting current tournament"));
    }
    res.json(data);
  }
}

module.exports = new TournamentController();
