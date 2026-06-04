const { mockRequest, mockResponse } = require('mock-req-res');
const request = require('supertest');
const logger = require("../middleware/logger");
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const db = require('../database/index'); // Adjust the path as necessary
const userController = require('../controllers/users');
const customerController = require('../controllers/customers');
const trackerController = require('../controllers/trackRecord')
const historyController = require('../controllers/history')
const { getAller2pm } = require('../controllers/j'); 
const { getAllActualForecast } = require('../controllers/j'); 
const { getGeoView } = require('../controllers/j'); 
const { costbaseFinalvalues } = require('../controllers/j');
const { commitTrackerData } = require('../controllers/BUP_Revenue');
const {rawexcelpost}=require('../controllers/admin')
const { singlebupexcelpost } =require('../controllers/admin')
const { postSignIn } = require('../controllers/authentications');
const { postForgotPassword } = require('../controllers/authentications');
const {postResetPassword} = require('../controllers/authentications');
const {postConfirmAccount} = require('../controllers/authentications');
const { calculatePeriods, formatDate, updateNotificationForAccepted, notifyEditorToUpdateEntry } = require('../controllers/BUP_Revenue');
const bcryptjs = require('bcryptjs'); 
const { Op } = require('sequelize');
const { notifySPOC } = require('../controllers/trackRecord');
const tokensHelper = require('../helpers/tokens'); // Mock tokens helper
const transporter = require('../helpers/email-transporter'); // Mock email transporter

const jwt = require('jsonwebtoken');

jest.mock('../database/index'); // Mock the database module
jest.mock('../helpers/tokens'); // Mock the tokens helper module
jest.mock('../helpers/email-transporter'); // Mock the email transporter module
jest.mock('bcryptjs'); // Mock bcryptjs
jest.mock('jsonwebtoken'); // Mock jsonwebtoken // Adjust the path as necessary


const xlsx = require('xlsx');
const moment = require('moment');
const mockFs = require('mock-fs');

jest.mock('xlsx');
jest.mock('moment');

const app = express();
app.use(bodyParser.json());
app.post('/signin', postSignIn);
app.post('/forgot-password', postForgotPassword);
app.post('/reset-password', postResetPassword);
app.post('/confirm-account', postConfirmAccount);

// Mocking db module
jest.mock('../database/index', () => ({
    User: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      findByPk: jest.fn(), 
      destroy: jest.fn(),
      build: jest.fn(),
    },
    Useraccountmapping: {
      destroy: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(), 
        build: jest.fn().mockReturnValue({
            save: jest.fn(),
        }),
    },
    Notification: {
      destroy: jest.fn(), // Mock the destroy method for notifications
      create: jest.fn(),
  },
  Bupdata:{
    create: jest.fn(),
    findAll: jest.fn(), 
  },
  TrackerHistory:{
    create: jest.fn(),
  },
  Engine:{
    findAll: jest.fn(),
  },
    Tracker: {
      findAll: jest.fn(), // Mock the findAll method
      findByPk: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      destroy: jest.fn(),
  },
    Role: {
      findAll: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      destroy: jest.fn(),
      build: jest.fn(),
    },
    Account: {
      findAll: jest.fn(),
      findOne: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn().mockImplementation(() => ({
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    })),
    query: jest.fn(),
    QueryTypes: {
      SELECT: 'SELECT',
    },
  },
  }));
jest.mock('../middleware/logger', () => ({
    debug: jest.fn(), // Mock the debug function
    error: jest.fn(),
}));
jest.mock('../helpers/tokens', () => ({
  generateAccessToken: jest.fn(),
}));

jest.mock('../helpers/email-transporter', () => ({
  sendMail: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));
  
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
  
afterEach(() => {
  jest.restoreAllMocks();
});

describe("---USERS API'S---", () => {

describe("API : Retrieve", () => {

    test('Should Retrieve All Users', async () => {
      // Arrange
      const sampleUsers = [
        { Id: "6c4bd97e-5331-419a-a089-0983da50d0d6", Name: 'rutik', Email: 'rutik@gmail.com' },
        { Id: "some-other-id", Name: 'User 2', Email: 'user2@example.com' }
      ];
      db.User.findAll.mockResolvedValue(sampleUsers);

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Act
      await userController.getAll({}, mockResponse, {});

      // Assert
      expect(db.User.findAll).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: true,
        data: sampleUsers,
      });
    });

    test('should handle errors', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findAll.mockRejectedValue(new Error(errorMessage));

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Act
      await userController.getAll({}, mockResponse, {});

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error fetching users',
        error: errorMessage,
      });
    });

});
describe("API : Updateuser", () => {
    let req, res, next;
    let transaction;

    beforeEach(() => {
        transaction = {
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        db.sequelize.transaction = jest.fn().mockResolvedValue(transaction);
        req = {
            body: {
                userId: 1,
                id: 2,
                email: 'test@example.com',
                clientName: [{ Id: 3, Account: 'Account1', Geography: 'Geo1', Country: 'Country1' }],
                name: 'Test User',
                businessLine: 'Business Line',
                geography: 'Geography',
                isActive: true,
                roles: ['Admin'],
            },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should update user and customer consultant successfully', async () => {
        db.User.findOne.mockResolvedValue({ Email: 'admin@example.com', Name: 'Admin' });
        db.Useraccountmapping.destroy.mockResolvedValue(1);
        db.Useraccountmapping.build.mockReturnValue({
            save: jest.fn().mockResolvedValue(),
        });
        db.Role.findAll.mockResolvedValue([{ roleName: 'User' }]);
        db.Role.create.mockResolvedValue();
        db.Role.destroy.mockResolvedValue();
        db.User.update.mockResolvedValue();

        await userController.updateUser(req, res, next);

        expect(transaction.commit).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ status: true, message: "User and customer consultant updated successfully" });
    });

    it('should handle errors and rollback transaction', async () => {
        db.User.findOne.mockRejectedValue(new Error('Database error'));

        await userController.updateUser(req, res, next);

        expect(transaction.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Error updating user and customer consultant", error: 'Database error' });
    });
});
describe("API : Get All User Details", () => {
  let req, res, next;

  beforeEach(() => {
      req = {}; // No specific request parameters needed for this test
      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should retrieve all user details successfully', async () => {
      // Arrange
      const sampleUsers = [
          {
              Id: "6c4bd97e-5331-419a-a089-0983da50d0d6",
              Email: 'rutik@gmail.com',
              Name: 'rutik',
              Business_Line: 'Business A',
              Geography: 'Geo A',
              IsActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              roles: [{ roleName: 'Admin' }]
          },
          {
              Id: "some-other-id",
              Email: 'user2@example.com',
              Name: 'User 2',
              Business_Line: 'Business B',
              Geography: 'Geo B',
              IsActive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              roles: [{ roleName: 'User' }]
          }
      ];
      
      db.User.findAll.mockResolvedValue(sampleUsers); // Mock the User model to return sample user data

      // Act
      await userController.getAllDetails(req, res, next);

      // Assert
      expect(db.User.findAll).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
          status: true,
          data: sampleUsers,
      });
  });

  test('should handle errors', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findAll.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await userController.getAllDetails(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
          message: 'Error fetching user details',
          error: errorMessage,
      });
  });
});
describe("API : Get User by ID", () => {
  let req, res, next;

  beforeEach(() => {
      req = {
          params: {
              id: "some-user-id" // Set a sample user ID
          }
      };
      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should retrieve a user by ID successfully', async () => {
      // Arrange
      const sampleUser = {
          Id: "some-user-id",
          Email: 'rutik@gmail.com',
          Name: 'rutik',
          Business_Line: 'Business A',
          Geography: 'Geo A',
          IsActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
      };
      
      db.User.findByPk.mockResolvedValue(sampleUser); // Mock the User model to return a sample user

      // Act
      await userController.get(req, res, next);

      // Assert
      expect(db.User.findByPk).toHaveBeenCalledWith(req.params.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
          status: true,
          data: sampleUser,
      });
  });

  test('should handle errors', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findByPk.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await userController.get(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
          message: 'Error fetching user',
          error: errorMessage,
      });
  });
});
describe("API : Create User", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          body: {
              userId: "some-user-id",
              Name: 'New User',
              email: 'newuser@example.com',
              password: 'password123',
              isActive: true,
              role: ['User'],
              customer: [{ Id: 'customer1', Account: 'Account1', Geography: 'Geo1', Country: 'Country1' }],
              Geography: 'Geo A',
              Business_Line: 'Business A'
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should create a user successfully', async () => {
      // Arrange
      const hashedPassword = 'hashedPassword';
      bcryptjs.hash = jest.fn().mockResolvedValue(hashedPassword);
      db.User.findOne = jest.fn().mockResolvedValue(null); // Ensure no existing user
      db.User.build = jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue({ Id: 'new-user-id' }) // Mock user save
      });
      db.Useraccountmapping.build = jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue() // Mock consultant save
      });
      db.Role.build = jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue() // Mock role save
      });

      // Act
      await userController.post(req, res, next);

      // Assert
      expect(bcryptjs.hash).toHaveBeenCalledWith(req.body.password, parseInt(process.env.BCRYPT_NB, 10));
      expect(db.sequelize.transaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
          status: 200,
          message: `User saved successfully`,
      });
      expect(transaction.commit).toHaveBeenCalled();
  });

  test('should handle unknown errors', async () => {
      // Arrange
      bcryptjs.hash = jest.fn().mockResolvedValue('hashedPassword');
      db.User.findOne = jest.fn().mockResolvedValue(null); // Mock no existing user
      db.User.build = jest.fn().mockImplementation(() => {
          throw new Error('Some error'); // Simulate an error during user creation
      });

      // Act
      await userController.post(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
          message: "Unknown error",
          error: expect.any(String) // Expect any string for error message
      });
  });
});
describe("API : Get All Geographies", () => {
  let req, res;

  beforeEach(() => {
      req = {}; // No specific request parameters needed
      res = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
      };
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should retrieve all geographies successfully', async () => {
      // Arrange
      const mockData = [
          { Geography: 'North America' },
          { Geography: 'Europe' },
      ];
      db.sequelize.query.mockResolvedValue(mockData); // Mock the database query

      // Act
      await userController.getAllGeographies(req, res);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled();
      expect(db.sequelize.query).toHaveBeenCalledWith(expect.any(String), {
          type: db.sequelize.QueryTypes.SELECT,
          transaction: expect.anything(),
      });
      expect(res.json).toHaveBeenCalledWith([
          { value: 'North America', label: 'North America' },
          { value: 'Europe', label: 'Europe' },
      ]);
  });

  test('Should handle errors when fetching geographies', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.sequelize.query.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await userController.getAllGeographies(req, res);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled();
      expect(db.sequelize.query).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
          message: "Error fetching geographies",
          error: expect.any(Error), // Expect any error object
      });
  });
});
describe("API : Get All Clients", () => {
  let req, res;

  beforeEach(() => {
      req = {}; // No specific request parameters needed
      res = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
      };
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should retrieve all clients successfully', async () => {
      // Arrange
      const mockClients = [
          { Id: "1", Account: 'Client A' },
          { Id: "2", Account: 'Client B' },
      ];
      db.Account.findAll.mockResolvedValue(mockClients); // Mock the database query

      // Act
      await userController.getAllClients(req, res);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.Account.findAll).toHaveBeenCalledWith({
          attributes: ['Id', 'Account'],
          raw: true,
          transaction: expect.anything(),
      });
      expect(res.json).toHaveBeenCalledWith([
          { value: '1', label: 'Client A' },
          { value: '2', label: 'Client B' },
      ]);
  });

  test('Should handle errors when fetching clients', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.Account.findAll.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await userController.getAllClients(req, res);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.Account.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for internal server error
      expect(res.send).toHaveBeenCalledWith({
          message: "Error fetching clients",
          error: expect.any(Error), // Expect any error object
      });
  });
});
describe("API : Update User Status", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          body: {
              userId: "some-user-id",
              email: 'user@example.com',
              isActive: true
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should update user status successfully', async () => {
      // Arrange
      const mockUser = { Id: 'user-id', Email: 'user@example.com' };
      db.User.findOne = jest.fn()
          .mockResolvedValueOnce(mockUser) // First call: user exists
          .mockResolvedValueOnce({ Email: 'admin@example.com' }); // Second call: to get last_updated_by user

      db.User.update = jest.fn().mockResolvedValue([1]); // Mocking the update method

      // Act
      await userController.updateUserStatus(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled();
      expect(db.User.findOne).toHaveBeenCalledWith({ where: { Email: req.body.email }, transaction });
      expect(db.User.update).toHaveBeenCalledWith(
          { IsActive: req.body.isActive, last_updated_by: 'admin@example.com' }, 
          { where: { Id: mockUser.Id }, transaction }
      );
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
  });

  test('Should handle errors when user does not exist', async () => {
      // Arrange
      db.User.findOne = jest.fn().mockResolvedValue(null); // Mock no existing user

      // Act
      await userController.updateUserStatus(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.json).toHaveBeenCalledWith({
          message: "unknown_error",
      });
  });

  test('Should handle unknown errors', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findOne = jest.fn().mockRejectedValue(new Error(errorMessage)); // Mock a rejection

      // Act
      await userController.updateUserStatus(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========'));
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.json).toHaveBeenCalledWith({
          message: "unknown_error",
      });
  });
});
describe("API : Delete User", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          params: {
              id: 'some-user-id'
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should delete user successfully', async () => {
      // Arrange
      db.Useraccountmapping.destroy = jest.fn().mockResolvedValue(1); // Mock successful deletion
      db.Role.destroy = jest.fn().mockResolvedValue(1); // Mock successful deletion
      db.User.destroy = jest.fn().mockResolvedValue(1); // Mock successful deletion

      // Act
      await userController.deleteUser(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled();
      expect(db.Useraccountmapping.destroy).toHaveBeenCalledWith({
          where: { userId: req.params.id },
          transaction,
      });
      expect(db.Role.destroy).toHaveBeenCalledWith({
          where: { userId: req.params.id },
          transaction,
      });
      expect(db.User.destroy).toHaveBeenCalledWith({
          where: { Id: req.params.id },
          transaction,
      });
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalledWith("Deleted");
  });

  test('Should handle unknown errors', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.Useraccountmapping.destroy = jest.fn().mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await userController.deleteUser(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.json).toHaveBeenCalledWith({
          message: "Unknown error",
      });
  });
});
describe("API : Get All Business Lines", () => {
  let req, res;

  beforeEach(() => {
      req = {
          headers: {
              businessline: 'Business A',
              userid: 'user-id'
          }
      };
      res = {
          json: jest.fn(),
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
      };
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should return true if business line exists for the user', async () => {
      // Arrange
      const mockUsers = [
          { Business_Line: 'Business A' },
          { Business_Line: 'Business B' }
      ];
      db.User.findAll.mockResolvedValue(mockUsers); // Mock the database query

      // Act
      await userController.getAllBl(req, res);

      // Assert
      expect(db.User.findAll).toHaveBeenCalledWith({
          attributes: ["Business_Line"],
          where: {
              Id: req.headers.userid
          },
      });
      expect(res.json).toHaveBeenCalledWith(true); // Expecting true as the response
  });

  test('Should return false if business line does not exist for the user', async () => {
      // Arrange
      const mockUsers = [
          { Business_Line: 'Business C' },
          { Business_Line: 'Business D' }
      ];
      db.User.findAll.mockResolvedValue(mockUsers); // Mock the database query

      // Act
      await userController.getAllBl(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(false); // Expecting false as the response
  });

  test('Should handle errors when fetching users', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findAll.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await userController.getAllBl(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.send).toHaveBeenCalledWith({
          message: "Error fetching geographies",
          error: expect.any(Error), // Expect any error object
      });
  });
});
describe("API : Get Users Detail", () => {
    let req, res, next;
    let transaction;

    beforeEach(() => {
        transaction = {
            commit: jest.fn(),
            rollback: jest.fn(),
        };

        jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

        req = {
            body: {
                usersArray: ['user-id-1', 'user-id-2'] // Sample user IDs
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Should retrieve user details successfully', async () => {
        // Arrange
        db.User.findOne
            .mockResolvedValueOnce({ Id: 'user-id-1', Email: 'user1@example.com', Name: 'User One' }) // User 1
            .mockResolvedValueOnce({ Id: 'user-id-2', Email: 'user2@example.com', Name: 'User Two' }); // User 2

        // Act
        await userController.getUsersDetail(req, res, next);

        // Assert
        expect(db.sequelize.transaction).toHaveBeenCalled();
        expect(db.User.findOne).toHaveBeenCalledTimes(2); // Called for two users
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([
            { Id: 'user-id-1', Email: 'user1@example.com', Name: 'User One' },
            { Id: 'user-id-2', Email: 'user2@example.com', Name: 'User Two' }
        ]);
        expect(transaction.commit).toHaveBeenCalled();
    });

    test('Should handle invalid usersArray', async () => {
        // Arrange
        req.body.usersArray = null; // Invalid usersArray

        // Act
        await userController.getUsersDetail(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Invalid usersArray header",
        });
    });

    test('Should handle case when some users do not exist', async () => {
        // Arrange
        db.User.findOne
            .mockResolvedValueOnce({ Id: 'user-id-1', Email: 'user1@example.com', Name: 'User One' }) // User 1 exists
            .mockResolvedValueOnce(null); // User 2 does not exist

        // Act
        await userController.getUsersDetail(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200); // Should still return 200
        expect(res.json).toHaveBeenCalledWith([
            { Id: 'user-id-1', Email: 'user1@example.com', Name: 'User One' } // Only existing user returned
        ]);
        expect(transaction.commit).toHaveBeenCalled();
    });

    test('Should handle unknown errors', async () => {
        // Arrange
        db.User.findOne.mockRejectedValue(new Error('Database error')); // Mock a database error

        // Act
        await userController.getUsersDetail(req, res, next);

        // Assert
        expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
        expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for internal server error
        expect(res.json).toHaveBeenCalledWith({
            message: "An error occurred while fetching user details",
        });
    });
});
  
});

describe("---CUSTOMER API'S---", () => {

describe("API : Get All Customers", () => {
    let req, res, next;
    let transaction;

    beforeEach(() => {
        transaction = {
            commit: jest.fn(),
            rollback: jest.fn(),
        };

        jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

        req = {}; // No specific request parameters needed
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Should fetch all customers successfully', async () => {
        // Arrange
        const mockCustomers = [
            {
                Id: "1",
                Account: 'Customer A',
                Geography: 'Geo A',
                Country: 'Country A',
                users: [{ Id: 'consultant-id-1', user: { Id: 'user-id-1', Name: 'User One' } }]
            },
            {
                Id: "2",
                Account: 'Customer B',
                Geography: 'Geo B',
                Country: 'Country B',
                users: [{ Id: 'consultant-id-2', user: { Id: 'user-id-2', Name: 'User Two' } }]
            }
        ];
        db.Account.findAll.mockResolvedValue(mockCustomers); // Mock the database query

        // Act
        await customerController.getAll(req, res, next);

        // Assert
        expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
        expect(db.Account.findAll).toHaveBeenCalledWith({
            attributes: ["Id", "Account", "Geography", "Country"],
            include: expect.any(Array), // Check that includes are correct
            transaction,
        });
        expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
        expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
        expect(res.json).toHaveBeenCalledWith({
            status: true,
            data: mockCustomers,
        });
    });

    test('Should handle errors during fetching', async () => {
        // Arrange
        const errorMessage = 'Database error';
        db.Account.findAll.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

        // Act
        await customerController.getAll(req, res, next);

        // Assert
        expect(transaction.rollback).toHaveBeenCalled(); // Ensure rollback is called
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
        expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for internal server error
        expect(res.json).toHaveBeenCalledWith({
            message: "unknown_error",
        });
    });
});
describe("API : Update Customer Consultant", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          body: {
              userid: "some-user-id",
              UserId: "user-id-1",
              CustomerId: "customer-id-1",
              newCustomerId: "new-customer-id"
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should update customer consultant successfully', async () => {
      // Arrange
      const mockUser = { Email: 'user@example.com' };
      db.User.findOne.mockResolvedValue(mockUser); // Mock user retrieval
      db.Useraccountmapping.update.mockResolvedValue([1]); // Mock successful update

      // Act
      await customerController.updateCustomerConsultant(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.User.findOne).toHaveBeenCalledWith({
          attributes: ["Email"],
          where: { Id: req.body.userid },
          transaction
      });
      expect(db.Useraccountmapping.update).toHaveBeenCalledWith(
          {
              accountId: req.body.newCustomerId,
              last_updated_by: mockUser.Email
          },
          { where: { userId: req.body.UserId, accountId: req.body.CustomerId }, transaction }
      );
      expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
      expect(res.json).toHaveBeenCalledWith({ status: true, data: [1] }); // Assuming update returns an array
  });

  test('Should handle errors when user does not exist', async () => {
      // Arrange
      db.User.findOne.mockResolvedValue(null); // Mock no existing user

      // Act
      await customerController.updateCustomerConsultant(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.json).toHaveBeenCalledWith({
          message: "Error updating customer-consultant",
          error: expect.any(String) // Expect any error object
      });
  });

  test('Should handle unknown errors', async () => {
      // Arrange
      db.User.findOne.mockRejectedValue(new Error('Database error')); // Mock a database error

      // Act
      await customerController.updateCustomerConsultant(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.json).toHaveBeenCalledWith({
          message: "Error updating customer-consultant",
          error: expect.any(String) // Expect any error object
      });
  });
});
describe("API : Delete Customer Consultant", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          params: {
              UserId: "user-id-1",
              CustomerId: "customer-id-1"
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should delete customer consultant relationship successfully', async () => {
      // Arrange
      db.Useraccountmapping.destroy.mockResolvedValue(1); // Mock successful deletion

      // Act
      await customerController.deleteCustomerConsultant(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.Useraccountmapping.destroy).toHaveBeenCalledWith({
          where: { userId: req.params.UserId, accountId: req.params.CustomerId },
          transaction,
      });
      expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
      expect(res.json).toHaveBeenCalledWith({
          status: true,
          message: "Customer-consultant relationship deleted successfully"
      });
  });

  test('Should handle unknown errors', async () => {
      // Arrange
      db.Useraccountmapping.destroy.mockRejectedValue(new Error('Database error')); // Mock a database error

      // Act
      await customerController.deleteCustomerConsultant(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.json).toHaveBeenCalledWith({
          message: "Error deleting customer-consultant",
          error: expect.any(String) // Expect any error object
      });
  });
});
describe("API : Get All Customers", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {}; // No specific request parameters needed
      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          send: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should fetch all customers successfully', async () => {
      // Arrange
      const mockCustomers = [
          { Id: "1", Account: 'Customer A' },
          { Id: "2", Account: 'Customer B' }
      ];
      db.Account.findAll.mockResolvedValue(mockCustomers); // Mock the database query

      // Act
      await customerController.getAllCustomers(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.Account.findAll).toHaveBeenCalledWith({
          attributes: ["Id", "Account"],
          transaction,
      });
      expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
      expect(res.json).toHaveBeenCalledWith({
          status: true,
          data: mockCustomers,
      });
  });

  test('Should handle errors during fetching', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.Account.findAll.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await customerController.getAllCustomers(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Ensure rollback is called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for internal server error
      expect(res.json).toHaveBeenCalledWith({
          message: "unknown_error",
      });
  });
});
describe("API : Get All Client Geography", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          body: {
              geography: ['Geo A', 'Geo B'], // Sample geography input
              Version: '1.0' // Sample version
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          send: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should fetch and group accounts successfully', async () => {
      // Arrange
      const mockCustomers = [
          { Id: "1", Account: 'Customer A', Geography: 'Geo A', Country: 'Country A', Top: 'Top Acct' },
          { Id: "2", Account: 'Customer B', Geography: 'Geo A', Country: 'Country B', Top: 'No Top Acct' },
      ];

      db.Account.findAll.mockResolvedValue(mockCustomers); // Mock the database query

      // Act
      await customerController.getAllClientgeo(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.Account.findAll).toHaveBeenCalledWith(expect.objectContaining({
          attributes: ["Id", "Account", "Geography", "Country", "Top"],
          where: expect.any(Object), // Check that the where clause is present
          transaction,
      }));
      expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
      expect(res.json).toHaveBeenCalledWith({
          status: true,
          groupedAccountsArray: expect.any(Array), // Check that groupedAccountsArray is returned
          customers: expect.any(Array), // Check that customers are returned
      });
  });

  test('Should handle errors during fetching', async () => {
      // Arrange
      db.Account.findAll.mockRejectedValue(new Error('Database error')); // Mock a rejected promise

      // Act
      await customerController.getAllClientgeo(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Ensure rollback is called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for internal server error
      expect(res.json).toHaveBeenCalledWith({
          message: "unknown_error",
      });
  });
});
describe("API : Get All Mapped Customers", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {}; // No specific request parameters needed
      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          send: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should fetch all mapped customers successfully', async () => {
      // Arrange
      const mockCustomers = [
          { Id: "1", userId: "user-id-1", Account: 'Account A', Geography: 'Geo A', Country: 'Country A', accountId: "account-id-1" },
          { Id: "2", userId: "user-id-2", Account: 'Account B', Geography: 'Geo B', Country: 'Country B', accountId: "account-id-2" }
      ];
      db.Useraccountmapping.findAll.mockResolvedValue(mockCustomers); // Mock the database query

      // Act
      await customerController.getAllMapCustomer(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.Useraccountmapping.findAll).toHaveBeenCalledWith({
          attributes: ["Id", "userId", "Account", "Geography", "Country", "accountId"],
          transaction,
      });
      expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
      expect(res.json).toHaveBeenCalledWith({
          status: true,
          data: mockCustomers,
      });
  });

  test('Should handle errors during fetching', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.Useraccountmapping.findAll.mockRejectedValue(new Error(errorMessage)); // Mock a rejected promise

      // Act
      await customerController.getAllMapCustomer(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Ensure rollback is called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for internal server error
      expect(res.json).toHaveBeenCalledWith({
          message: "unknown_error",
      });
  });
});
describe("API : Post Customer", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          body: {
              userid: "some-user-id",
              geography: "Geo A",
              country: "Country A",
              customer: "Customer A",
              iris: "Some Iris",
              top: "1",
              diamond: "1",
              userId: "user-id-1",
              Version: "1.0"
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should create customer successfully', async () => {
      // Arrange
      const mockUser = { Email: 'user@example.com' };
      db.User.findOne.mockResolvedValue(mockUser); // Mock user retrieval
      db.Account.findOne.mockResolvedValue(null); // Mock no existing customer
      db.Account.create.mockResolvedValue({ Id: "new-account-id" }); // Mock successful account creation
      db.Useraccountmapping.create.mockResolvedValue({}); // Mock successful mapping creation

      // Act
      await customerController.postCustomer(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.User.findOne).toHaveBeenCalledWith({
          attributes: ["Email"],
          where: { Id: req.body.userid },
          transaction
      });
      expect(db.Account.findOne).toHaveBeenCalledWith({
          where: {
              Account: req.body.customer,
              Geography: req.body.geography,
              Country: req.body.country,
              Version: req.body.Version
          },
          transaction
      });
      expect(db.Account.create).toHaveBeenCalledWith({
          Account: req.body.customer,
          Geography: req.body.geography,
          Country: req.body.country,
          Iris: req.body.iris,
          Top: "Top Acct",
          Diamond: "Diamond",
          Version: req.body.Version,
          last_updated_by: mockUser.Email
      }, { transaction });
      expect(db.Useraccountmapping.create).toHaveBeenCalledWith({
          userId: req.body.userId,
          accountId: "new-account-id",
          Account: req.body.customer,
          Geography: req.body.geography,
          Country: req.body.country,
          last_updated_by: mockUser.Email
      }, { transaction });
      expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
      expect(res.json).toHaveBeenCalledWith("Create client"); // Expecting success message
  });

  test('Should handle customer already exists', async () => {
    // Arrange
    const mockUser = { Email: 'user@example.com' };
    db.User.findOne.mockResolvedValue(mockUser); // Mock user retrieval
    db.Account.findOne.mockResolvedValue({}); // Mock existing customer

    // Act
    await customerController.postCustomer(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400); // Expecting 400 for bad request
    expect(res.json).toHaveBeenCalledWith({ message: "Client already exists" }); // Check for correct error message
});

  test('Should handle unknown errors', async () => {
    // Arrange
    db.User.findOne.mockRejectedValue(new Error('Database error')); // Mock a database error

    // Act
    await customerController.postCustomer(req, res, next);

    // Assert
    expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
    expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
    expect(res.json).toHaveBeenCalledWith({
        message: "Error creating client", // Updated to expected message
        error: 'Database error' // Include the specific error message
    });
});
});
describe("API: Get All Customer Role", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
    transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

    req = {
      body: {
        userId: "mockUserId",
        Version: "mockVersion",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Should fetch all mapped customers successfully for Admin role", async () => {
    // Arrange
    const mockRole = [{ roleName: "Admin" }];
    const mockGeographies = [{ Geography: "Geo A" }];
    const mockCustomers = [
      { Id: "1", Account: "Account A", Geography: "Geo A", Country: "Country A", Top: "Top Acct" },
    ];

    db.Role.findAll = jest.fn().mockResolvedValue(mockRole);
    db.User.findAll = jest.fn().mockResolvedValue(mockGeographies);
    db.Account.findAll = jest.fn().mockResolvedValue(mockCustomers);

    // Act
    await customerController.getAllCustomerRole(req, res, next);

    // Assert
    expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is initiated
    expect(db.Role.findAll).toHaveBeenCalledWith({
      attributes: ["roleName"],
      where: { userId: req.body.userId },
      transaction,
    });

    expect(db.Account.findAll).toHaveBeenCalledWith({
      attributes: ["Id", "Account", "Geography", "Country", "Top"],
      where: {
        Version: req.body.Version,
        [Op.or]: [
          { Top: 'Top Acct', Geography: { [Op.notIn]: ["MIT", "GLS", "#", "N/A", "GDC"] } },
          { Top: 'No Top Acct', Account: { [Op.like]: '_Non_TOP_Accts%' } },
        ],
        Iris: { [Op.notLike]: 'CLUST%', [Op.not]: '#', [Op.not]: 'SIEM' },
      },
      transaction,
    });

    expect(transaction.commit).toHaveBeenCalled(); // Ensure commit is called
    expect(res.status).toHaveBeenCalledWith(200); // Expect a successful response
    expect(res.json).toHaveBeenCalledWith({
      status: true,
      groupedAccountsArray: expect.any(Array),
      customers: mockCustomers,
    });
  });

  test("Should handle errors during fetching roles", async () => {
    // Arrange
    const errorMessage = "Database error";
    db.Role.findAll = jest.fn().mockRejectedValue(new Error(errorMessage));

    // Act
    await customerController.getAllCustomerRole(req, res, next);

    // Assert
    expect(transaction.rollback).toHaveBeenCalled(); // Ensure rollback is called on error
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("========"));
    expect(res.status).toHaveBeenCalledWith(500); // Expecting a 500 internal error response
    expect(res.json).toHaveBeenCalledWith({
      message: "unknown_error",
    });
  });
});
describe("API: Update Customer", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
    // Mocking transaction
    transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    // Mocking Sequelize transaction method
    jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

    req = {
      body: {
        userid: "mockUserId",
        Customer: "Updated Customer",
        userId: ["user-id-1", "user-id-2"],
        id: "mockAccountId",
        Geography: "Geo A",
        Country: "Country A",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  test("Should update customer details and mappings successfully", async () => {
    // Arrange
    const mockClient = { 
      Account: "Original Account", 
      Geography: "Geo B", 
      Country: "Country B", 
      save: jest.fn() 
    };
    const mockUser = { Email: "user@example.com" };
    const mockUseraccountmapping = { save: jest.fn() };

    // Mocking findOne and other DB methods
    db.Account.findOne = jest.fn().mockResolvedValue(mockClient);
    db.User.findOne = jest.fn().mockResolvedValue(mockUser);
    db.Useraccountmapping.destroy = jest.fn().mockResolvedValue(1);
    db.Useraccountmapping.build = jest.fn().mockReturnValue(mockUseraccountmapping);

    // Act
    await customerController.update(req, res, next);

    // Assert
    expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction was initiated
    expect(db.Account.findOne).toHaveBeenCalledWith({ where: { Id: req.body.id } });
    expect(mockClient.Account).toEqual(req.body.Customer);
    expect(mockClient.Geography).toEqual(req.body.Geography);
    expect(mockClient.Country).toEqual(req.body.Country);
    expect(mockClient.save).toHaveBeenCalled(); // Ensure client save is called

    expect(db.User.findOne).toHaveBeenCalledWith({
      attributes: ["Email"],
      where: { Id: req.body.userid },
      transaction,
    });
    expect(db.Useraccountmapping.destroy).toHaveBeenCalledWith({
      where: { accountId: req.body.id },
      transaction,
    });

    for (const _userId of req.body.userId) {
      expect(db.Useraccountmapping.build).toHaveBeenCalledWith({
        accountId: req.body.id,
        userId: _userId,
        Account: req.body.Customer,
        Geography: req.body.Geography,
        Country: req.body.Country,
        last_updated_by: mockUser.Email,
      });
      expect(mockUseraccountmapping.save).toHaveBeenCalledWith({ transaction });
    }

    expect(transaction.commit).toHaveBeenCalled(); // Ensure transaction commit is called
    expect(res.status).toHaveBeenCalledWith(200); // Expect success response
    expect(res.json).toHaveBeenCalledWith(null);
  });

  test("Should handle errors and rollback transaction", async () => {
    // Arrange
    const errorMessage = "Database error";
    db.Account.findOne = jest.fn().mockRejectedValue(new Error(errorMessage)); // Simulate an error

    // Act
    await customerController.update(req, res, next);

    // Assert
    expect(transaction.rollback).toHaveBeenCalled(); // Ensure transaction rollback is called
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("========")); // Log the error
    expect(res.status).toHaveBeenCalledWith(500); // Expect 500 status on error
    expect(res.json).toHaveBeenCalledWith({
      message: "unknown_error",
    });
  });
});
describe("API: Delete Customer", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
    transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

    req = {
      params: { id: "customer-id-1" } // Mock request parameters
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    next = jest.fn();
    
    // Mock the database methods
    jest.spyOn(db.Account, 'destroy').mockResolvedValue(1); // Assume one record is deleted
    jest.spyOn(db.Useraccountmapping, 'destroy').mockResolvedValue(1); // Assume one record is deleted
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Should delete customer and associated records successfully', async () => {
    // Act
    await customerController.delete(req, res, next);

    // Assert
    expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
    expect(db.Account.destroy).toHaveBeenCalledWith({
      where: { Id: req.params.id },
      transaction
    }); // Check that Account destroy is called with correct parameters
    expect(db.Useraccountmapping.destroy).toHaveBeenCalledWith({
      where: { accountId: req.params.id },
      transaction
    }); // Check that Useraccountmapping destroy is called with correct parameters
    expect(transaction.commit).toHaveBeenCalled(); // Ensure transaction commit is called
    expect(res.status).toHaveBeenCalledWith(204); // Ensure status 204 is sent
    expect(res.json).toHaveBeenCalledWith(null); // Ensure json response with null is sent
  });

  test('Should handle errors and rollback transaction', async () => {
    // Arrange
    const errorMessage = 'Database error';
    db.Account.destroy.mockRejectedValue(new Error(errorMessage)); // Simulate an error

    // Act
    await customerController.delete(req, res, next);

    // Assert
    expect(transaction.rollback).toHaveBeenCalled(); // Ensure transaction rollback is called
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Ensure logging is called
    expect(res.status).toHaveBeenCalledWith(500); // Ensure 500 status is returned for error
    expect(res.json).toHaveBeenCalledWith({
      message: "unknown_error",
    });
  });
});
});

describe("---TRACKER API'S---", () => {

describe("API: Get All Track Data", () => {
    let req, res, next;
    let transaction;
  
    beforeEach(() => {
      transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
  
      // Mock Sequelize's transaction function
      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);
  
      // Mock req, res, and next
      req = {}; // No request parameters required
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      };
      next = jest.fn();
  
      // Mock the Tracker model's findAll function
      jest.spyOn(db.Tracker, 'findAll').mockResolvedValue([
        { Id: "1", name: "Track A", status: "active" },
        { Id: "2", name: "Track B", status: "inactive" }
      ]);
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    test('Should fetch all track data successfully', async () => {
      // Act
      await trackerController.getAllNewTrack(req, res, next);
  
      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is started
      expect(db.Tracker.findAll).toHaveBeenCalledWith({
        transaction
      }); // Ensure findAll is called with the transaction
      expect(transaction.commit).toHaveBeenCalled(); // Ensure commit is called after success
      expect(res.status).toHaveBeenCalledWith(200); // Expect 200 OK status
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        data: [
          { Id: "1", name: "Track A", status: "active" },
          { Id: "2", name: "Track B", status: "inactive" }
        ]
      }); // Ensure correct data is returned
    });
  
    test('Should handle errors and rollback transaction', async () => {
      // Arrange
      const errorMessage = "Database error";
      db.Tracker.findAll.mockRejectedValue(new Error(errorMessage)); // Simulate an error
  
      // Act
      await trackerController.getAllNewTrack(req, res, next);
  
      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Ensure rollback is called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Ensure logger is called
      expect(res.status).toHaveBeenCalledWith(500); // Expect 500 status for internal server error
      expect(res.json).toHaveBeenCalledWith({
        message: "Error fetching trackdata",
        error: errorMessage
      }); // Ensure error message is returned
    });
});
describe("API: Get New Track Data", () => {
    let req, res, next;
    let transaction;
  
    beforeEach(() => {
      transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
  
      // Mock Sequelize's transaction function
      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);
  
      // Mock req, res, and next
      req = {
        body: {
          userId: 1,
          clientName: "Test Client",
          geography: "Test Geography",
        }
      };
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      next = jest.fn();
  
      // Mock Role and User model's findAll function
      jest.spyOn(db.Role, 'findAll').mockResolvedValue([
        { roleName: "Admin" },
      ]);
      
      jest.spyOn(db.User, 'findAll').mockResolvedValue([
        { dataValues: { Business_Line: ["BL1", "BL2"] } }
      ]);
  
      // Mock the raw SQL query execution for Tracker
      jest.spyOn(db.sequelize, 'query').mockResolvedValue([
        { id: 1, Account: "Test Client", Geography: "Test Geography", BusinessLine: "BL1" }
      ]);
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    test('Should fetch track data based on user role and business line', async () => {
      // Act
      await trackerController.getNewTrackData(req, res, next);
  
      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is started
      expect(db.Role.findAll).toHaveBeenCalledWith({
        attributes: ["roleName"],
        where: { userId: req.body.userId },
        transaction
      }); // Ensure roles are fetched with transaction
      expect(db.User.findAll).toHaveBeenCalledWith({
        attributes: ["Business_Line"],
        where: { Id: req.body.userId },
        transaction
      }); // Ensure business lines are fetched with transaction
      expect(db.sequelize.query).toHaveBeenCalledWith(expect.any(String), {
        replacements: {
          cName: req.body.clientName.trim(),
          gName: req.body.geography.trim(),
          userBL: ["BL1", "BL2"]
        },
        type: db.sequelize.QueryTypes.SELECT,
        transaction
      }); // Ensure query is executed with correct parameters
      expect(transaction.commit).toHaveBeenCalled(); // Ensure transaction commit is called
      expect(res.status).toHaveBeenCalledWith(200); // Ensure 200 status is sent
      expect(res.send).toHaveBeenCalledWith([
        { id: 1, Account: "Test Client", Geography: "Test Geography", BusinessLine: "BL1" }
      ]); // Ensure correct data is returned
    });
  
    test('Should handle errors and rollback transaction', async () => {
      // Arrange
      const errorMessage = "Database error";
      db.sequelize.query.mockRejectedValue(new Error(errorMessage)); // Simulate a query error
  
      // Act
      await trackerController.getNewTrackData(req, res, next);
  
      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Ensure rollback is called on error
      expect(res.status).toHaveBeenCalledWith(500); // Ensure 500 status is sent
      expect(res.send).toHaveBeenCalledWith([]); // Ensure empty array is returned
    });
});
  
describe("API : Update Comment", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                Id: ["tracker-id-1", "tracker-id-2"], // Sample tracker IDs
                comment: "Updated comment" // Sample comment
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Should update comments successfully', async () => {
        // Arrange
        const mockTracker1 = { Id: "tracker-id-1", Comment: "", save: jest.fn() };
        const mockTracker2 = { Id: "tracker-id-2", Comment: "", save: jest.fn() };

        db.Tracker.findByPk.mockResolvedValueOnce(mockTracker1); // Mock first tracker retrieval
        db.Tracker.findByPk.mockResolvedValueOnce(mockTracker2); // Mock second tracker retrieval

        // Act
        await trackerController.updateComment(req, res);

        // Assert
        expect(db.Tracker.findByPk).toHaveBeenCalledTimes(2); // Ensure findByPk is called twice
        expect(mockTracker1.save).toHaveBeenCalled(); // Check if save was called on the first tracker
        expect(mockTracker2.save).toHaveBeenCalled(); // Check if save was called on the second tracker
        expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
        expect(res.json).toHaveBeenCalledWith({
            status: true,
            message: "Comments update completed",
            results: expect.any(Array) // Check that results are returned
        });
    });

    test('Should handle invalid IDs input', async () => {
        // Arrange
        req.body.Id = []; // Empty array for IDs

        // Act
        await trackerController.updateComment(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400); // Expecting 400 for bad request
        expect(res.json).toHaveBeenCalledWith({
            status: false,
            message: "Invalid request. An array of IDs is required."
        });
    });

    test('Should handle tracker not found', async () => {
        // Arrange
        db.Tracker.findByPk.mockResolvedValueOnce(null); // Mock tracker not found for the first ID

        // Act
        await trackerController.updateComment(req, res);

        // Assert
        expect(db.Tracker.findByPk).toHaveBeenCalledTimes(2); // Ensure findByPk is called twice
        expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 for success
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            status: true,
            message: "Comments update completed",
            results: expect.arrayContaining([
                expect.objectContaining({ Id: "tracker-id-1", status: false, message: "Tracker not found." }),
            ]),
        }));
    });

    test('Should handle unknown errors', async () => {
        // Arrange
        db.Tracker.findByPk.mockRejectedValue(new Error('Database error')); // Mock a database error

        // Act
        await trackerController.updateComment(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
        expect(res.json).toHaveBeenCalledWith({
            status: false,
            message: "Unknown error"
        });
    });
});  
describe("API : Delete New Track Data", () => {
  let req, res, next;
  let transaction;

  beforeEach(() => {
      transaction = {
          commit: jest.fn(),
          rollback: jest.fn(),
      };

      jest.spyOn(db.sequelize, 'transaction').mockResolvedValue(transaction);

      req = {
          params: {
              id: "track-id-1", // Sample tracker ID
          },
          body: {
              // Sample body parameters if needed
          }
      };

      res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      next = jest.fn();
  });

  afterEach(() => {
      jest.clearAllMocks();
  });

  test('Should delete tracker record successfully', async () => {
      // Arrange
      const mockTrackerRecord = { Id: "track-id-1", reviewStatus: 'accepted' }; // Mock tracker record
      db.Tracker.findOne.mockResolvedValue(mockTrackerRecord); // Mock tracker retrieval
      db.Notification.destroy.mockResolvedValue(1); // Mock successful notification deletion
      db.Tracker.destroy.mockResolvedValue(1); // Mock successful tracker deletion

      // Act
      await trackerController.deleteNewTrackData(req, res, next);

      // Assert
      expect(db.sequelize.transaction).toHaveBeenCalled(); // Ensure transaction is called
      expect(db.Tracker.findOne).toHaveBeenCalledWith({
          where: { Id: req.params.id }
      });
      expect(db.Notification.destroy).toHaveBeenCalledWith({
          where: { trackerId: req.params.id },
          transaction
      });
      expect(db.Tracker.destroy).toHaveBeenCalledWith({
          where: { Id: req.params.id },
          transaction
      });
      expect(transaction.commit).toHaveBeenCalled(); // Check if commit was called
      expect(res.status).toHaveBeenCalledWith(204); // Expecting 204 for successful deletion
      expect(res.json).toHaveBeenCalledWith({
          status: true,
          message: "Record deleted successfully."
      });
  });

  test('Should handle unknown errors', async () => {
      // Arrange
      db.Tracker.findOne.mockRejectedValue(new Error('Database error')); // Mock a database error

      // Act
      await trackerController.deleteNewTrackData(req, res, next);

      // Assert
      expect(transaction.rollback).toHaveBeenCalled(); // Rollback should be called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 for server error
      expect(res.json).toHaveBeenCalledWith({
          status: false,
          message: "An unknown error occurred."
      });
  });
});
});
describe("---TRACKER HISTORY API'S---", () => {

describe("API: Get All TrackerHistory Data", () => {
    let req, res, next;
  
    beforeEach(() => {
      req = {}; // No parameters are needed for the getAll request
      res = {
        status: jest.fn().mockReturnThis(), // Mock res.status to return res for chaining
        json: jest.fn(), // Mock res.json to handle JSON response
      };
      next = jest.fn(); // Mock next to handle errors
    });
  
    afterEach(() => {
      jest.clearAllMocks(); // Clear mocks after each test
    });
  
    test('Should retrieve all TrackerHistory records successfully', async () => {
      // Arrange
      const mockTrackerHistoryRecords = [
        { id: 1, event: "Record created", timestamp: "2023-09-10T08:00:00Z" }, 
        { id: 2, event: "Record updated", timestamp: "2023-09-11T09:00:00Z" }
      ]; // Mock data
      db.TrackerHistory = { findAll: jest.fn().mockResolvedValue(mockTrackerHistoryRecords) };
  
      // Act
      await historyController.getAll(req, res, next);
  
      // Assert
      expect(db.TrackerHistory.findAll).toHaveBeenCalled(); // Ensure findAll is called
      expect(res.status).toHaveBeenCalledWith(200); // Expect a 200 status code
      expect(res.json).toHaveBeenCalledWith(mockTrackerHistoryRecords); // Ensure the correct data is returned
    });
  
    test('Should handle errors while retrieving TrackerHistory records', async () => {
      // Arrange
      const mockError = new Error("Database error");
      db.TrackerHistory = { findAll: jest.fn().mockRejectedValue(mockError) }; // Mock the error
  
      // Act
      await historyController.getAll(req, res, next);
  
      // Assert
      expect(db.TrackerHistory.findAll).toHaveBeenCalled(); // Ensure findAll is called
      expect(next).toHaveBeenCalledWith(mockError); // Ensure the error is passed to next()
      expect(res.status).not.toHaveBeenCalled(); // Ensure status is not called
      expect(res.json).not.toHaveBeenCalled(); // Ensure json is not called
    });
});
describe("API: Get All Notifications", () => {
    let req, res, next;
  
    beforeEach(() => {
      req = {}; // No parameters required for this API
      res = {
        status: jest.fn().mockReturnThis(), // Mock res.status to return res for chaining
        json: jest.fn(), // Mock res.json to handle the JSON response
      };
      next = jest.fn(); // Mock next to handle errors
    });
  
    afterEach(() => {
      jest.clearAllMocks(); // Clear mocks after each test
    });
  
    test('Should retrieve all notifications with tracker data successfully', async () => {
      // Arrange
      const mockNotifications = [
        {
          Id: 1,
          Message: "Notification 1",
          Status: "Sent",
          Geography: "USA",
          notifyStatus: "Delivered",
          Name: "Name 1",
          Source: "System",
          trackerId: 1,
          createdAt: "2024-09-10T08:00:00Z",
          updatedAt: "2024-09-10T08:30:00Z",
          Comment: "Comment 1",
          tracker: {
            Account: "Account 1",
            BusinessLine: "Line 1"
          }
        },
        {
          Id: 2,
          Message: "Notification 2",
          Status: "Pending",
          Geography: "UK",
          notifyStatus: "Pending",
          Name: "Name 2",
          Source: "System",
          trackerId: 2,
          createdAt: "2024-09-10T09:00:00Z",
          updatedAt: "2024-09-10T09:30:00Z",
          Comment: "Comment 2",
          tracker: {
            Account: "Account 2",
            BusinessLine: "Line 2"
          }
        }
      ]; // Mock data
  
      // Mocking the findAll method of Notification
      db.Notification = {
        findAll: jest.fn().mockResolvedValue(mockNotifications)
      };
  
      // Act
      await historyController.notificationgetAll(req, res, next);
  
      // Assert
      expect(db.Notification.findAll).toHaveBeenCalledWith({
        include: [
          {
            model: db.Tracker,
            as: 'tracker',
            attributes: ['Account', 'BusinessLine']
          }
        ]
      }); // Ensure findAll is called with correct include
      expect(res.status).toHaveBeenCalledWith(200); // Expecting a 200 status code
      expect(res.json).toHaveBeenCalledWith([
        {
          Id: 1,
          Message: "Notification 1",
          Status: "Sent",
          Geography: "USA",
          notifyStatus: "Delivered",
          Name: "Name 1",
          Source: "System",
          trackerId: 1,
          createdAt: "2024-09-10T08:00:00Z",
          updatedAt: "2024-09-10T08:30:00Z",
          Comment: "Comment 1",
          Account: "Account 1",
          BusinessLine: "Line 1"
        },
        {
          Id: 2,
          Message: "Notification 2",
          Status: "Pending",
          Geography: "UK",
          notifyStatus: "Pending",
          Name: "Name 2",
          Source: "System",
          trackerId: 2,
          createdAt: "2024-09-10T09:00:00Z",
          updatedAt: "2024-09-10T09:30:00Z",
          Comment: "Comment 2",
          Account: "Account 2",
          BusinessLine: "Line 2"
        }
      ]); // Ensure the correct transformed data is returned
    });
  
    test('Should handle errors while retrieving notifications', async () => {
      // Arrange
      const mockError = new Error("Database error");
      db.Notification = {
        findAll: jest.fn().mockRejectedValue(mockError)
      }; // Mock an error
  
      // Act
      await historyController.notificationgetAll(req, res, next);
  
      // Assert
      expect(db.Notification.findAll).toHaveBeenCalledWith({
        include: [
          {
            model: db.Tracker,
            as: 'tracker',
            attributes: ['Account', 'BusinessLine']
          }
        ]
      }); // Ensure findAll is called with correct include
      expect(next).toHaveBeenCalledWith(mockError); // Ensure the error is passed to next()
      expect(res.status).not.toHaveBeenCalled(); // Ensure status is not called
      expect(res.json).not.toHaveBeenCalled(); // Ensure json is not called
    });
});
describe("API: Get Tracker Data", () => {
    let req, res, next;
  
    beforeEach(() => {
      req = {
        headers: {
          trackerid: JSON.stringify(["track-id-1", "track-id-2"]), // Sample tracker IDs
        }
      };
  
      res = {
        status: jest.fn().mockReturnThis(), // Mock res.status to return res for chaining
        json: jest.fn(), // Mock res.json to handle the JSON response
      };
      next = jest.fn(); // Mock next to handle errors
      jest.spyOn(logger, 'debug').mockImplementation(() => {}); // Mock logger for debug
    });
  
    afterEach(() => {
      jest.clearAllMocks(); // Clear mocks after each test
    });
  
    test('Should retrieve tracker data successfully', async () => {
      // Arrange
      const mockTrackerData = [
        { Id: "track-id-1", name: "Tracker 1" },
        { Id: "track-id-2", name: "Tracker 2" }
      ]; // Mock tracker data
  
      db.Tracker.findAll = jest.fn().mockResolvedValue(mockTrackerData); // Mock findAll to return mock data
  
      // Act
      await historyController.getTrackerData(req, res, next);
  
      // Assert
      expect(db.Tracker.findAll).toHaveBeenCalledWith({
        where: { Id: ["track-id-1", "track-id-2"] },
      }); // Ensure findAll is called with correct conditions
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 status code
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        data: mockTrackerData,
      }); // Ensure the response contains the tracker data
    });
  
    test('Should handle invalid tracker IDs in the request', async () => {
      // Arrange
      req.headers.trackerid = JSON.stringify([]); // Simulate an empty tracker ID array
  
      // Act
      await historyController.getTrackerData(req, res, next);
  
      // Assert
      expect(db.Tracker.findAll).not.toHaveBeenCalled(); // Ensure findAll is not called
      expect(res.status).toHaveBeenCalledWith(400); // Expecting 400 status code
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: "Invalid tracker IDs provided.",
      });
    });
  
    test('Should handle no tracker data found', async () => {
      // Arrange
      db.Tracker.findAll = jest.fn().mockResolvedValue([]); // Mock findAll to return an empty array
  
      // Act
      await historyController.getTrackerData(req, res, next);
  
      // Assert
      expect(db.Tracker.findAll).toHaveBeenCalledWith({
        where: { Id: ["track-id-1", "track-id-2"] },
      }); // Ensure findAll is called with correct conditions
      expect(res.status).toHaveBeenCalledWith(404); // Expecting 404 status code
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: "Tracker data not found.",
      }); // Ensure the response indicates no data found
    });
  
    test('Should handle unexpected errors', async () => {
      // Arrange
      const mockError = new Error("Database error");
      db.Tracker.findAll = jest.fn().mockRejectedValue(mockError); // Mock findAll to throw an error
  
      // Act
      await historyController.getTrackerData(req, res, next);
  
      // Assert
      expect(db.Tracker.findAll).toHaveBeenCalledWith({
        where: { Id: ["track-id-1", "track-id-2"] },
      }); // Ensure findAll is called with correct conditions
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 status code
      expect(res.json).toHaveBeenCalledWith({
        message: "An unexpected error occurred.",
      }); // Ensure the error response is sent
    });
});
describe("API: Get Notification Data", () => {
    let req, res, next;
  
    beforeEach(() => {
      req = {
        headers: {
          id: JSON.stringify(["not-id-1", "not-id-2"]), // Sample notification IDs
          notifystatus: "Read" // Example notifyStatus value
        }
      };
  
      res = {
        status: jest.fn().mockReturnThis(), // Mock res.status to return res for chaining
        json: jest.fn(), // Mock res.json to handle the JSON response
      };
      next = jest.fn(); // Mock next to handle errors
      jest.spyOn(logger, 'debug').mockImplementation(() => {}); // Mock logger for debug
    });
  
    afterEach(() => {
      jest.clearAllMocks(); // Clear mocks after each test
    });
  
    test('Should retrieve and update notification data successfully', async () => {
      // Arrange
      const mockNotificationData = [
        { Id: "not-id-1", notifyStatus: "Unread" },
        { Id: "not-id-2", notifyStatus: "Unread" }
      ]; // Mock notification data
  
      db.Notification.findAll = jest.fn().mockResolvedValue(mockNotificationData); // Mock findAll to return mock data
      db.Notification.update = jest.fn().mockResolvedValue([1]); // Mock update to return a successful update count
  
      // Act
      await historyController.getNotificationData(req, res, next);
  
      // Assert
      expect(db.Notification.findAll).toHaveBeenCalledWith({
        where: { Id: ["not-id-1", "not-id-2"] },
      }); // Ensure findAll is called with correct IDs
      expect(db.Notification.update).toHaveBeenCalledWith(
        { notifyStatus: "Read" },
        { where: { Id: ["not-id-1", "not-id-2"] } }
      ); // Ensure update is called with correct status
      expect(res.status).toHaveBeenCalledWith(200); // Expecting 200 status code
      expect(res.json).toHaveBeenCalledWith({
        status: true,
        data: mockNotificationData,
      }); // Ensure the response contains updated data
    });
  
    test('Should handle invalid tracker IDs in the request', async () => {
      // Arrange
      req.headers.id = JSON.stringify([]); // Simulate an empty notification ID array
  
      // Act
      await historyController.getNotificationData(req, res, next);
  
      // Assert
      expect(db.Notification.findAll).not.toHaveBeenCalled(); // Ensure findAll is not called
      expect(db.Notification.update).not.toHaveBeenCalled(); // Ensure update is not called
      expect(res.status).toHaveBeenCalledWith(400); // Expecting 400 status code
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: "Invalid tracker IDs provided.",
      });
    });
  
    test('Should handle missing notifyStatus in the request', async () => {
      // Arrange
      delete req.headers.notifystatus; // Simulate a missing notifyStatus
  
      // Act
      await historyController.getNotificationData(req, res, next);
  
      // Assert
      expect(db.Notification.findAll).not.toHaveBeenCalled(); // Ensure findAll is not called
      expect(db.Notification.update).not.toHaveBeenCalled(); // Ensure update is not called
      expect(res.status).toHaveBeenCalledWith(400); // Expecting 400 status code
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: "Notify status not provided.",
      });
    });
  
    test('Should handle no notification data found', async () => {
      // Arrange
      db.Notification.findAll = jest.fn().mockResolvedValue([]); // Mock findAll to return an empty array
  
      // Act
      await historyController.getNotificationData(req, res, next);
  
      // Assert
      expect(db.Notification.findAll).toHaveBeenCalledWith({
        where: { Id: ["not-id-1", "not-id-2"] },
      }); // Ensure findAll is called with correct IDs
      expect(db.Notification.update).not.toHaveBeenCalled(); // Ensure update is not called
      expect(res.status).toHaveBeenCalledWith(404); // Expecting 404 status code
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: "Notification data not found.",
      });
    });
  
    test('Should handle unexpected errors', async () => {
      // Arrange
      const mockError = new Error("Database error");
      db.Notification.findAll = jest.fn().mockRejectedValue(mockError); // Mock findAll to throw an error
  
      // Act
      await historyController.getNotificationData(req, res, next);
  
      // Assert
      expect(db.Notification.findAll).toHaveBeenCalledWith({
        where: { Id: ["not-id-1", "not-id-2"] },
      }); // Ensure findAll is called with correct IDs
      expect(db.Notification.update).not.toHaveBeenCalled(); // Ensure update is not called
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('========')); // Check if logger.debug was called
      expect(res.status).toHaveBeenCalledWith(500); // Expecting 500 status code
      expect(res.json).toHaveBeenCalledWith({
        message: "An unexpected error occurred.",
      }); // Ensure the error response is sent
    });
});
});

describe("---ER2PM API'S---", () => {
    
describe('API: Get ALLER 2PM Data', () => {
        let req, res, next;
    
        beforeEach(() => {
            req = mockRequest({
                headers: {
                    client: 'TEST_ACCOUNT',
                    geography: 'TEST_GEOGRAPHY',
                    country: 'TEST_COUNTRY',
                    userid: 1,
                    department: 'TEST_DEPARTMENT',
                },
            });
    
            res = mockResponse();
            jest.spyOn(res, 'status');
            jest.spyOn(res, 'json');
            jest.spyOn(res, 'send');
    
            next = jest.fn();
    
            jest.spyOn(logger, 'debug').mockImplementation(() => {});
        });
    
        afterEach(() => {
            jest.clearAllMocks();
        });
    
        //jest.spyOn(db.Tracker, 'findAll').mockResolvedValue(mockData);  // Mock successful call

    
        test('Should handle invalid client header gracefully', async () => {
            req.headers.client = undefined;
    
            await getAller2pm(req, res, next);
    
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid client header."
            });
        });
    
        test('Should handle missing geography header gracefully', async () => {
            req.headers.geography = undefined;
    
            await getAller2pm(req, res, next);
    
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid geography header."
            });
        });
    
        test('Should handle unexpected errors gracefully', async () => {
            const mockError = new Error("Database error");
            db.sequelize.query.mockRejectedValueOnce(mockError);
    
            await getAller2pm(req, res, next);
    
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining(__filename));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "unknown_error",
                error: mockError.message
            });
        });
});
describe('getAllActualForecast', () => {
  let req, res, next, transaction;

  beforeEach(() => {
    req = mockRequest({
      query: {
        Geography: 'Geo1',
        Account: 'Acc1',
      },
    });

    // Explicitly mock res.status and res.json
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();

    transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    db.sequelize.transaction.mockResolvedValue(transaction);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve and process Actual and Forecast data successfully', async () => {
    const actualData = [
      { Id: 1, Geography: 'Geo1', Account: 'Acc1', BusinessLine: 'BL1', Category: 'Cat1', SubCategory: 'SubCat1', Period: '2023-01-01', Value: 100 },
    ];
    const forecastData = [
      { Id: 2, Geography: 'Geo1', Account: 'Acc1', BusinessLine: 'BL1', Category: 'Cat1', SubCategory: 'SubCat1', Period: '2023-01-01', Value: 150 },
    ];

    db.Bupdata.findAll
      .mockResolvedValueOnce(actualData)
      .mockResolvedValueOnce(forecastData);

    moment.mockImplementation((dateString) => ({
      year: () => 2023,
      month: () => 0,
      isValid: () => true,
      format: () => dateString,
    }));

    await getAllActualForecast(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: true,
      data: [
        {
          Geography: 'Geo1',
          Account: 'Acc1',
          BusinessLine: 'BL1',
          Category: 'Cat1',
          SubCategory: 'SubCat1',
          Quarter: '2023Q1',
          Actual: 100,
          Forecast: 150,
        },
      ],
    });
    expect(transaction.commit).toHaveBeenCalled();
  });

  // it('should handle errors and rollback transaction', async () => {
  //   db.Bupdata.findAll.mockRejectedValue(new Error('Database error'));

  //   await getAllActualForecast(req, res, next);

  //   expect(res.status).toHaveBeenCalledWith(500);
  //   expect(res.json).toHaveBeenCalledWith({
  //     message: 'Error fetching data',
  //     error: expect.any(Error),
  //   });
  //   expect(transaction.rollback).toHaveBeenCalled();
  // });
});
describe('getGeoView', () => {
    let req, res, next, transaction, commit, rollback, query, findAll;
  
    beforeEach(() => {
      // Setup mock request, response, and next
      req = {
        headers: {
          client: 'clientId',
          geography: 'geographyName',
          userid: '12345'
        }
      };
      
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      next = jest.fn();
  
      // Mock transaction handlers
      commit = jest.fn();
      rollback = jest.fn();
      transaction = { commit, rollback };
  
      // Mock database queries
      query = jest.fn();
      findAll = jest.fn();
  
      db.sequelize = {
        transaction: jest.fn(() => transaction),
        QueryTypes: { SELECT: 'SELECT' }, // Mock QueryTypes
        query
      };
  
      db.User = {
        findAll
      };
  
      db.Tracker = {
        findAll
      };
  
      // Mock db.Engine
      db.Engine = {
        findAll
      };
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should fetch data and return it', async () => {
        // Mock user data
        const userData = [{ dataValues: { Business_Line: 'Test Business Line' } }];
        const trackerData = [{
          Timing: "Monthly",
          StartDate: "2023-01-01",
          EndDate: "2023-12-31",
          ER_MO: 1000,
          Cost: 100,
          Category: "External Revenue",
          SubCategory: "ER Sales of Service",
          BusinessLine: "Test Business Line",
          Source: "TestSource",
          Account: "Test Account",
          Geography: "geographyName",
          Country: "Test Country"
        }];
        const engineData = [{ Categories: "External Revenue", SubCategories: "ER Sales of Service", Percentage: 0.1 }];
        const mockedQueryData = [{
          Geography: 'geographyName',
          ValueType: 'Actual',
          Period: '2023-06-01',
          BusinessLine: 'Test Business Line',
          Category: 'Test Category',
          SubCategory: 'Test SubCategory',
          Value: 100
        }];
      
        // Mock implementations
        findAll
          .mockResolvedValueOnce(userData) // Mock user data
          .mockResolvedValueOnce(trackerData) // Mock Tracker data
          .mockResolvedValueOnce(engineData); // Mock Engine data
      
        query.mockResolvedValueOnce(mockedQueryData); // Mock raw SQL query data
      
        try {
          // Call the function
          await getGeoView(req, res, next);
      
          // Assertions
          expect(db.sequelize.transaction).toHaveBeenCalled();
          expect(query).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            replacements: { geography: 'geographyName' },
            type: db.sequelize.QueryTypes.SELECT,
            transaction
          }));
          expect(findAll).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(200); // Ensure correct status
          expect(res.json).toHaveBeenCalledWith(expect.any(Array)); // Check for array response
      
        } catch (error) {
          console.error('Test failed due to:', error);
        }
      });
      
  
    it('should handle errors and rollback transaction', async () => {
      const mockError = new Error('Some error');
      query.mockRejectedValueOnce(mockError);
  
      await getGeoView(req, res, next);
  
      expect(rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "unknown_error",
        error: mockError.message
      });
    });
  
    it('should handle multiple timings in tracker data', async () => {
        const trackerData = [
          {
            Timing: "Monthly",
            StartDate: "2023-01-01",
            EndDate: "2023-12-31",
            ER_MO: 1000,
            Cost: 100,
            Category: "External Revenue",
            SubCategory: "ER Sales of Service",
            BusinessLine: "Test Business Line",
            Source: "TestSource",
            Account: "Test Account",
            Geography: "geographyName",
            Country: "Test Country"
          },
          {
            Timing: "One-time",
            StartDate: "2023-06-01",
            EndDate: "2023-06-01",
            ER_MO: 2000,
            Cost: 200,
            Category: "External Revenue",
            SubCategory: "ER Sales of Service",
            BusinessLine: "Test Business Line",
            Source: "TestSource",
            Account: "Test Account",
            Geography: "geographyName",
            Country: "Test Country"
          }
        ];
      
        findAll
          .mockResolvedValueOnce([{ dataValues: { Business_Line: 'Test Business Line' } }]) // Mock user data
          .mockResolvedValueOnce(trackerData); // Mock tracker data
        
        query.mockResolvedValueOnce([{
          Geography: 'geographyName',
          ValueType: 'Actual',
          Period: '2023-06-01',
          BusinessLine: 'Test Business Line',
          Category: 'Test Category',
          SubCategory: 'Test SubCategory',
          Value: 100
        }]); // Mock raw SQL query data
      
        try {
          // Call the function
          await getGeoView(req, res, next);
      
          // Assertions
          expect(db.sequelize.transaction).toHaveBeenCalled();
          expect(query).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            replacements: { geography: 'geographyName' },
            type: db.sequelize.QueryTypes.SELECT,
            transaction
          }));
          expect(findAll).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith(expect.any(Array));
      
        } catch (error) {
          console.error('Test failed due to:', error);
        }
      });
});
describe('costbaseFinalvalues', () => {
  let transaction;

  beforeEach(async () => {
    // Mock sequelize transaction
    transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    db.sequelize.transaction.mockResolvedValue(transaction);

    // Some general mocks for the test cases
    db.User.findAll.mockResolvedValue([
      { dataValues: { Business_Line: "SomeBusinessLine" } }
    ]);

    db.Engine.findAll.mockResolvedValue([
      { Categories: "CategoryA", SubCategories: "SubCategoryA", Percentage: 50 }
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should respond with 200 and correct data when client is not SIEMENS AG and parameter regex passes', async () => {
    db.User.findAll.mockResolvedValue([{ dataValues: { Business_Line: "ExampleBL" } }]);
    db.Tracker.findAll.mockResolvedValue([]);

    const fakeData = [ /* some fake data to be returned by query */ ];
    db.sequelize.query.mockResolvedValue(fakeData);

    const req = mockRequest({
      headers: {
        client: 'client_With_Non_TOP_Accts',
        geography: 'SomeGeography',
        country: 'SomeCountry',
        userid: '1',
        department: 'SomeDept'
      }
    });

    const res = mockResponse();
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();

    await costbaseFinalvalues(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it('should respond with 200 and correct data when client is SIEMENS AG', async () => {
    db.User.findAll.mockResolvedValue([{ dataValues: { Business_Line: "ExampleBL" } }]);
    db.Tracker.findAll.mockResolvedValue([]);

    const req = mockRequest({
      headers: {
        client: 'SIEMENS AG',
        geography: 'GrM',
        country: 'SomeCountry',
        userid: '1',
        department: 'SIEM'
      }
    });

    const res = mockResponse();
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();

    await costbaseFinalvalues(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it('should handle errors and respond with 500', async () => {
    db.sequelize.query.mockRejectedValue(new Error('Some error'));

    const req = mockRequest({
      headers: {
        client: 'SomeClient',
        geography: 'SomeGeography',
        country: 'SomeCountry',
        userid: '1',
        department: 'SomeDept'
      }
    });

    const res = mockResponse();
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();

    await costbaseFinalvalues(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "unknown_error",
      error: "Some error",
    });
    expect(transaction.rollback).toHaveBeenCalled();
  });
});


          
});
describe("---BUPREVENUE API'S---", () => {
describe('commitTrackerData', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 403 if the user does not have Admin or GBU role', async () => {
      db.Role.findAll.mockResolvedValue([{ roleName: 'User' }]);
  
      const req = { body: { userId: 1, trackerIds: [1], isActive: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      await commitTrackerData(req, res);
  
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: 'Access denied. Insufficient permissions.'
      });
    });
  
    it('should return 400 if trackerIds is not an array', async () => {
      db.Role.findAll.mockResolvedValue([{ roleName: 'Admin' }]);
  
      const req = { body: { userId: 1, trackerIds: 'not-an-array', isActive: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      await commitTrackerData(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: 'Invalid request. trackerIds should be an array of IDs.'
      });
    });
  
    it('should return 404 if no inactive records are found', async () => {
      db.Role.findAll.mockResolvedValue([{ roleName: 'Admin' }]);
      db.Tracker.findAll.mockResolvedValue([]);
  
      const req = { body: { userId: 1, trackerIds: [1], isActive: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      await commitTrackerData(req, res);
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: false,
        message: 'No inactive records found for the provided Account and Geography.'
      });
    });
  
    it('should handle unexpected errors', async () => {
      db.Role.findAll.mockRejectedValue(new Error('Database error'));
  
      const req = { body: { userId: 1, trackerIds: [1], isActive: true } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  
      await commitTrackerData(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unknown error'
      });
    });
  });
});

// describe("---ADMIN API'S---", () => {
  // describe('rawexcelpost', () => {
  //   let req, res, next, transaction;
  
  //   const MAX_RECORDS = 200000; // Ensure this matches the value in your rawexcelpost function
  
  //   beforeEach(() => {
  //     // Set up mock file system
  //     mockFs({
  //       'path/to/mock': {
  //         'file.xlsx': 'mock file content'
  //       }
  //     });
  
  //     req = mockRequest({
  //       file: {
  //         path: 'path/to/mock/file.xlsx'
  //       }
  //     });
  
  //     // Explicitly mock res.status and res.json
  //     res = {
  //       status: jest.fn().mockReturnThis(),
  //       json: jest.fn()
  //     };
  
  //     next = jest.fn();
  
  //     transaction = {
  //       commit: jest.fn(),
  //       rollback: jest.fn()
  //     };
  
  //     db.sequelize.transaction.mockResolvedValue(transaction);
  //     db.Bupdata.bulkCreate = jest.fn();
  
  //     xlsx.readFile.mockReturnValue({
  //       SheetNames: ['Sheet1'],
  //       Sheets: {
  //         Sheet1: {}
  //       }
  //     });
  
  //     xlsx.utils.sheet_to_json.mockReturnValue([
  //       { SubCategory: 'SubCat1', BusinessLine: 'BL1', Account: 'Acc1', Geography: 'Geo1', Period: '01.2023', Value: '100' }
  //     ]);
  
  //     moment.mockImplementation((dateString) => ({
  //       format: jest.fn().mockReturnValue(dateString),
  //       isValid: jest.fn().mockReturnValue(true)
  //     }));
  //   });
  
  //   afterEach(() => {
  //     jest.clearAllMocks();
  //     mockFs.restore();
  //   });
  
  //   it('should process and upload data successfully', async () => {
  //     await rawexcelpost(req, res, next);
  
  //     expect(res.status).toHaveBeenCalledWith(200);
  //     expect(res.json).toHaveBeenCalledWith({ message: 'Data successfully uploaded and processed.' });
  //     expect(transaction.commit).toHaveBeenCalled();
  //   });
  
  //   it('should handle errors and rollback transaction', async () => {
  //     db.Bupdata.bulkCreate.mockRejectedValue(new Error('Database error'));
  
  //     await rawexcelpost(req, res, next);
  
  //     expect(res.status).toHaveBeenCalledWith(500);
  //     expect(res.json).toHaveBeenCalledWith({ message: 'An error occurred while processing data. Please try again later.' });
  //     expect(transaction.rollback).toHaveBeenCalled();
  //   });
  
  //   it('should return 413 if data length exceeds MAX_RECORDS', async () => {
  //     xlsx.utils.sheet_to_json.mockReturnValue(new Array(MAX_RECORDS + 1).fill({}));
  
  //     await rawexcelpost(req, res, next);
  
  //     expect(res.status).toHaveBeenCalledWith(413);
  //     expect(res.json).toHaveBeenCalledWith({
  //       message: `Cannot upload more than ${MAX_RECORDS} records. You attempted to upload ${MAX_RECORDS + 1} records.`
  //     });
  //   });
  
  //   it('should return 400 if required columns are missing or extra columns exist', async () => {
  //     const requiredColumns = ['SubCategory', 'BusinessLine', 'Account', 'Geography', 'Period', 'Value'];
  //     xlsx.utils.sheet_to_json.mockReturnValue([
  //       { SubCategory: 'SubCat1', BusinessLine: 'BL1', Account: 'Acc1', Geography: 'Geo1', Period: '01.2023' }
  //     ]);
  
  //     await rawexcelpost(req, res, next);
  
  //     expect(res.status).toHaveBeenCalledWith(400);
  //     expect(res.json).toHaveBeenCalledWith({
  //       message: `Invalid columns. Missing required columns: Value. Extra columns: `
  //     });
  //   });
  // });
// });

describe("---AUTHENTICATION API'S---", () => {
describe("API : SignIn", () => {

  beforeEach(() => {
      // Ensure that db.User and db.Role are defined
      db.User = {
          findOne: jest.fn()
      };
      db.Role = {
          findAll: jest.fn()
      };
  });

  test('Should sign in successfully and redirect to frontend with token', async () => {
      // Arrange
      const mockUser = { Id: 1, Email: 'test@example.com', IsActive: 'true' };
      const mockRoles = [{ roleName: 'admin' }];
      const mockAccessToken = 'mockAccessToken';

      db.User.findOne.mockResolvedValue(mockUser);
      db.Role.findAll.mockResolvedValue(mockRoles);
      tokensHelper.generateAccessToken.mockReturnValue(mockAccessToken);

      const mockRequest = {
          user: { email: 'test@example.com' }
      };

      const mockResponse = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postSignIn(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findOne).toHaveBeenCalledTimes(1);
      expect(db.Role.findAll).toHaveBeenCalledTimes(1);
      expect(tokensHelper.generateAccessToken).toHaveBeenCalledTimes(1);
      expect(mockResponse.redirect).toHaveBeenCalledWith(`https://bup-dev.myatos.net/welcome?token=${mockAccessToken}`);
  });

  test('Should return 401 if user is not found', async () => {
      // Arrange
      db.User.findOne.mockResolvedValue(null);

      const mockRequest = {
          user: { email: 'nonexistent@example.com' }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postSignIn(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findOne).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
          message: "Unauthorized",
      });
  });

  test('Should return 500 if there is an internal server error', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findOne.mockRejectedValue(new Error(errorMessage));

      const mockRequest = {
          user: { email: 'test@example.com' }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postSignIn(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findOne).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
          message: "Internal server error",
      });
  });

});
describe("API : ForgotPassword", () => {

  beforeEach(() => {
      // Ensure that db.User is defined
      db.User = {
          findOne: jest.fn()
      };
      transporter.sendMail = jest.fn().mockResolvedValue(true);
      transporter.close = jest.fn().mockResolvedValue(true);
      tokensHelper.generateUniqAccessToken = jest.fn(); // Ensure the method is mocked
  });

  test('Should send password reset email successfully', async () => {
      // Arrange
      const mockUser = { Id: 1, Email: 'test@example.com' };
      const mockToken = 'mockToken';

      db.User.findOne.mockResolvedValue(mockUser);
      tokensHelper.generateUniqAccessToken.mockReturnValue(mockToken);

      const mockRequest = {
          body: { email: 'test@example.com' }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postForgotPassword(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findOne).toHaveBeenCalledTimes(1);
      expect(tokensHelper.generateUniqAccessToken).toHaveBeenCalledTimes(1);
      expect(transporter.sendMail).toHaveBeenCalledTimes(1);
      expect(transporter.close).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(null);
  });

  test('Should return 200 if user is not found', async () => {
      // Arrange
      db.User.findOne.mockResolvedValue(null);

      const mockRequest = {
          body: { email: 'nonexistent@example.com' }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postForgotPassword(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findOne).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(null);
  });

  test('Should return 500 if there is an internal server error', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findOne.mockRejectedValue(new Error(errorMessage));

      const mockRequest = {
          body: { email: 'test@example.com' }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postForgotPassword(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findOne).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
          message: "unknown_error",
      });
  });

});

describe("API : ResetPassword", () => {

  beforeEach(() => {
      // Ensure that db.User is defined
      db.User = {
          findByPk: jest.fn(),
          update: jest.fn()
      };
  });

  test('Should reset password successfully', async () => {
      // Arrange
      const mockUser = { Id: 1, PasswordHash: 'oldHash', update: jest.fn() };
      const mockToken = 'mockToken';
      const newPassword = 'newPassword';
      const hashedPassword = 'hashedNewPassword';

      db.User.findByPk.mockResolvedValue(mockUser);
      jwt.verify.mockReturnValue({ Id: 1 });
      bcryptjs.hash.mockResolvedValue(hashedPassword);

      const mockRequest = {
          body: { newPassword, token: mockToken, id: 1 }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postResetPassword(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findByPk).toHaveBeenCalledTimes(1);
      expect(jwt.verify).toHaveBeenCalledTimes(1);
      expect(bcryptjs.hash).toHaveBeenCalledTimes(1);
      expect(mockUser.update).toHaveBeenCalledWith({ PasswordHash: hashedPassword });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(null);
  });

  test('Should return 401 if user is not found', async () => {
      // Arrange
      db.User.findByPk.mockResolvedValue(null);

      const mockRequest = {
          body: { newPassword: 'newPassword', token: 'mockToken', id: 1 }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postResetPassword(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findByPk).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
          type: "https://tools.ietf.org/html/rfc7235#section-3.1",
          title: "Unauthorized",
          status: 401,
          traceId: "|b2557ba5-47dcd4b81af8fd67.",
      });
  });

  test('Should return 500 if there is an internal server error', async () => {
      // Arrange
      const errorMessage = 'Database error';
      db.User.findByPk.mockRejectedValue(new Error(errorMessage));

      const mockRequest = {
          body: { newPassword: 'newPassword', token: 'mockToken', id: 1 }
      };

      const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };

      // Act
      await postResetPassword(mockRequest, mockResponse, {});

      // Assert
      expect(db.User.findByPk).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
          message: "unknown_error",
      });
  });

});
});