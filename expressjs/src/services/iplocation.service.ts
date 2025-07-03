import axios from "axios"
import type { IpLocation } from "../types"

export class IpLocationService {
  private readonly baseUrl = "https://api.iplocation.net"

  async getLocation(ip: string): Promise<IpLocation | null> {
    try {
      const response = await axios.get<IpLocation>(`${this.baseUrl}/`, {
        params: { ip },
        timeout: 5000,
      })

      return response.data
    } catch (error) {
      console.error("Failed to get location for IP address:", error)
      return null
    }
  }
}
