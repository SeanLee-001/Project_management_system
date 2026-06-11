import { relations } from "drizzle-orm/relations";
import { users, projects, tasks } from "./schema";

export const projectsRelations = relations(projects, ({one, many}) => ({
	user: one(users, {
		fields: [projects.ownerId],
		references: [users.id]
	}),
	tasks: many(tasks),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects: many(projects),
	tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id]
	}),
}));