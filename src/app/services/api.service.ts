import { Injectable } from "@angular/core"
import { HttpClient } from '@angular/common/http';
import { ISendCmdBody, ISendCmdError } from "../interfaces/api.interface";
import { catchError } from 'rxjs/operators';
import { throwError } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({ providedIn: 'root' })
export class ApiService {
  baseUrl = environment.baseUrl

  constructor(private httpClient: HttpClient) {

  }

  sendCmd<T = any>(body: ISendCmdBody) {
    const url = this.baseUrl + '/command-lines'
    return this.httpClient.post<T>(url, body).pipe(
      catchError(error => throwError(error.error as ISendCmdError))
    )
  }
}