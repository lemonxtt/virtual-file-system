import { Component } from '@angular/core';
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
  cmdHistories: ICmdHistory[] = [
    {
      currentPath: '/',
      cmd: "cd /main",
      results: "abc"
    },
    {
      currentPath: '/main',
      cmd: 'ls -l',
      results: "abc"
    },
  ]

  constructor(
    private apiService: ApiService
  ) { }

  onKeyDownEvent(event: any) {
    if ((event as KeyboardEvent).key === 'Enter') {
      const body = {
        currentPath: this.currentWorkingFolder,
        cmd: this.currentCmd
      }
      this.apiService.sendCmd(body).subscribe(response => {
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
            results = response as IFolder
          } else if (/^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/.test(this.currentCmd)) {
            const { name } = (response as IFolder)
            results = `${name} created successfully`
          } else if (/^rm +[a-zA-Z0-9 *.\/_-]+$/.test(this.currentCmd)) {
            const { name } = (response as IFolder)
            results = `${name} deleted`
          }
          this.cmdHistories.push({
            ...body,
            results
          })
        }
        this.currentCmd = ''
      })
    }
  }
}
