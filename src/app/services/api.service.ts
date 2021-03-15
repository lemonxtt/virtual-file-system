import { Injectable } from "@angular/core"
import { HttpClient } from '@angular/common/http';
import { ISendCmdBody } from "../interfaces/api.interface";

@Injectable({ providedIn: 'root' })
export class ApiService {
  baseUrl = 'http://localhost:3001'

  constructor(private httpClient: HttpClient) {

  }

  sendCmd<T = any>(body: ISendCmdBody) {
    const url = this.baseUrl + '/command-lines'
    return this.httpClient.post<T>(url, body)
  }
}