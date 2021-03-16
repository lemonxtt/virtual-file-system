import { Component } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ISendCmdCdResponse, ISendCmdError } from './interfaces/api.interface';
import { ICmdHistory, IFileFolder } from './interfaces/cmd.interface';
import { IFile } from './interfaces/file.interface';
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
            if (logElement) {
              setTimeout(() => {
                // scroll to bottom
                logElement.scrollTop = logElement?.scrollHeight;
              }, 0);
            }
          })
        )
        .subscribe(
          response => {
            let results;
            if (/^ls((\s+-l)?(\s+\d+)?)$|^ls((\s+\d+)?(\s+-l)?)$/.test(this.currentCmd)) {
              const combineDepth = (folder: IFolder, isDetail: boolean): IFileFolder => {
                return {
                  ...folder,
                  isDetail,
                  fileFolders: [
                    ...((folder.files || []).map(file => ({ ...file, isFile: true })) as IFileFolder[]),
                    ...((folder.folders || []).map(_folder => combineDepth(_folder, isDetail)))
                  ]
                }
              }
              const isDetail = body.cmd.includes(' -l')
              this.cmdHistories.push({
                ...body,
                fileFolders: combineDepth(response, isDetail).fileFolders,
                isDetail
              })
              console.log('cmdHistories :>> ', this.cmdHistories);
            } else {
              if (/^cd\s+/.test(this.currentCmd)) {
                results = `new working folder:  ${(response as ISendCmdCdResponse).newWorkingFolder}`
                this.currentWorkingFolder = response.newWorkingFolder
              } else if (/^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/.test(this.currentCmd)) {
                const { name } = (response as IFolder)
                results = `created ${name}`
              } else if (/^rm +[a-zA-Z0-9 *.\/_-]+$/.test(this.currentCmd)) {
                results = `deleted successfully`
              }
              this.cmdHistories.push({
                ...body,
                results
              })
            }
          }, (error: ISendCmdError) => {
            console.log(error);
            if (error.statusCode === 8) { // CURRENT_PATH_NOT_EXISTS
              this.currentCmd = '/'
            }
            this.cmdHistories.push({
              ...body,
              errorMessage: error.message
            })
          }
        )
    }
  }
}
