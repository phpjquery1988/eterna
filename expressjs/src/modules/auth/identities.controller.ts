import type { Response } from "express"
import { IdentitiesService } from "./identities.service"
import { AuthMappers } from "./auth.mappers"
import type { AuthRequest, ApiResponse, GetIdentitiesQuery } from "../../types"
import { asyncHandler } from "../../middleware/errorHandler"

export class IdentitiesController {
  private identitiesService: IdentitiesService

  constructor() {
    this.identitiesService = new IdentitiesService()
  }

  get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const query: GetIdentitiesQuery = {
      page: Number.parseInt(req.query.page as string) || 1,
      limit: Number.parseInt(req.query.limit as string) || 10,
      sort: req.query.sort as string,
      search: req.query.search as string,
      provider: req.query.provider as string,
      userId: req.query.userId as string,
    }

    const result = await this.identitiesService.get(query)

    const response: ApiResponse = {
      success: true,
      message: "Identities fetched successfully",
      data: AuthMappers.identitiesToDtoPaged(result),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })
}
