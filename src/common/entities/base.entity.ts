import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

export class BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number
  
  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}