const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const { validateRegisterInput, validateLoginInput } = require('../../util/validators');
const User = require('../../models/User');
const { SECRET_KEY } = require('../../config');

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            username: user.username
        },
        SECRET_KEY,
        { expiresIn: '1h' }
    );
}


module.exports = {
    Mutation: {
        async login(_, {username, password}) {
            const { valid, errors } = validateLoginInput(username, password);
            if(!valid){
                throw new UserInputError("Error", { errors });
            }

            const user = await User.findOne({ username });
            if(!user){
                errors.general = 'User not found';
                throw new UserInputError('User not found', { errors });
            }
            const match = await bcrypt.compare(password, user.password);
            if(!match){
                errors.general = 'Wrong Credentials';
                throw new UserInputError('Wrong Credentials', { errors });
            }
            const token = generateToken(user);

            return {
                ...user._doc,
                id: user.id,
                token
            }
        },
        // parent gives you the result of the last step. (last resolver)
        async register(parent, {registerInput: {username, email, password, confirmPassword}}, context, info){
            // TODO: validate the data
            const { valid, errors } = validateRegisterInput(username, email, password, confirmPassword);
            if(!valid){
                throw new UserInputError('Errors', { errors });
            }


            // Make sure user doesnt exist
            const user = await User.findOne({username })
            if(user){
                throw new UserInputError('Username is taken', {
                    errors: {
                        username: 'This username is taken'
                    }
                })
            }

            // hash the password and create auth token
            password = await bcrypt.hash(password, 12);
            const newUser = new User({
                email,
                username,
                password,
                createdAt: new Date().toISOString()
            })

            const res = await newUser.save();

            const token = generateToken(res);

            return {
                ...res._doc,
                id: res.id,
                token
            }
        }
    }
}

