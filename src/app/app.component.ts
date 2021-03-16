import { Component } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ISendCmdCdResponse, ISendCmdError } from './interfaces/api.interface';
import { ICmdHistory } from './interfaces/cmd.interface';
import { IFolder } from './interfaces/folder.interface';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'virtual-file-system';

  currentWorkingFolder = '/'
  currentCmd = ''
  cmdHistories: ICmdHistory[] = []

  constructor(
    private apiService: ApiService
  ) { }

  onKeyDownEvent(event: any) {
    if ((event as KeyboardEvent).key === 'Enter') {
      const body = {
        currentPath: this.currentWorkingFolder,
        cmd: this.currentCmd
      }
      this.apiService.sendCmd(body)
      .pipe(
        finalize(() => {
          this.currentCmd = ''
          const logElement = document.getElementById("command-histories");
          console.log('logElement', logElement);
          if (logElement) {
            setTimeout(() => {
              logElement.scrollTop = logElement?.scrollHeight;
            }, 0);
          }
        })
      )
      .subscribe(
        response => {
          let results;
          if (/^ls((\s+-l)?(\s+\d+)?)$|^ls((\s+\d+)?(\s+-l)?)$/.test(this.currentCmd)) {
            const { files, folders } = response as IFolder
            this.cmdHistories.push({
              ...body,
              files,
              folders
            })
          } else {
            if (/^cd\s+/.test(this.currentCmd)) {
              results =  `new working folder:  ${(response as ISendCmdCdResponse).newWorkingFolder}`
              this.currentWorkingFolder = response.newWorkingFolder
            } else if (/^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/.test(this.currentCmd)) {
              const { name } = (response as IFolder)
              results = `created ${name}`
            } else if (/^rm +[a-zA-Z0-9 *.\/_-]+$/.test(this.currentCmd)) {
              // const deletedItems = (response as IFolder[]).map(e => e.name)
              results = `deleted successfully}`
            }
            this.cmdHistories.push({
              ...body,
              results
            })
          }
        }, (error: ISendCmdError) => {
          console.log(error);
          this.cmdHistories.push({
            ...body,
            errorMessage: error.message
          })
        }
      )
    }
  }
}
