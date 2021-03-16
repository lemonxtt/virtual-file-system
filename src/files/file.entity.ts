import { BaseEntity } from 'src/common/entities/base.entity'
import { Folder } from 'src/folders/folder.entity'
import { Entity, Column, Unique, ManyToOne, JoinColumn } from 'typeorm'

@Entity()
export class File extends BaseEntity {
  @Column({ length: 128 })
  name: string

  @Column('text')
  value: string

  @Column('int')
  size: number

  @ManyToOne(type => Folder, { nullable: true })
  @JoinColumn()
  folder: Folder
}