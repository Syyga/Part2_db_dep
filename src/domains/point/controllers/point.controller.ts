import { ApiSignature } from "../../../types";
import pointService from "../services/point.service";

export const getUserPoints: ApiSignature = async (req, res) => {
  const userId = req.user.id;

  const response = await pointService.getUserPoints(userId);

  res.status(201).send(response);
};
