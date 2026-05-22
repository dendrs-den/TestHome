import { Request, Response, NextFunction } from "express";
const ApiError = require("../error/ApiError.ts");
const URL = process.env.CORE_API_URL;
const $host = require("./index");

class DisciplinesController {
  async getById(req: Request, res: Response, next: NextFunction) {}

  async create(req: Request, res: Response, next: NextFunction) {}

  async delete(req: Request, res: Response, next: NextFunction) {}

  async update(req: Request, res: Response, next: NextFunction) {}
}

module.exports = new DisciplinesController();
