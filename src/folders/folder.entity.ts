import { BaseEntity } from 'src/common/entities/base.entity'
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm'
import { File } from 'src/files/file.entity'

@Entity()
export class Folder extends BaseEntity {

  @Column({ length: 128 })
  name: string

  @OneToMany(() => File, file => file.folder)
  files?: File[]

  @OneToMany(() => Folder, folder => folder.folder, { cascade: true })
  folders: Folder[]

  @ManyToOne(() => Folder, { nullable: true })
  @JoinColumn()
  folder: Folder
}

export class FolderSize extends Folder {
  size: number

  // folders: FolderSize
}
