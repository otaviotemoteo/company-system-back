import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // Não retornar senha nas respostas
  senha: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.FUNCIONARIO,
  })
  role: Role;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'data_criacao' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'data_atualizacao' })
  dataAtualizacao: Date;
}
