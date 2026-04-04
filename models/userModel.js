import { usersDb } from "./_db.js";

export const UserModel = {
  async create(user) {
    return usersDb.insert(user);
  },
  async findByEmail(email) {
    return usersDb.findOne({ email });
  },
  async findById(id) {
    return usersDb.findOne({ _id: id });
  },
  async lookup(email) {
    return usersDb.findOne({ email });
  },
  async list(filter = {}) {
    return usersDb.find(filter).sort({ name: 1 });
  },
  async update(id, patch) {
    await usersDb.update({ _id: id }, { $set: patch });
    return this.findById(id);
  },
  async delete(id) {
    return usersDb.remove({ _id: id }, {});
  },
};
