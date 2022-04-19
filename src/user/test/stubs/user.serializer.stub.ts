import { UserSerializer } from "src/user/serializers/user.serializer"

export const userSerializerStub = () : UserSerializer => {
    return {
        firstName: 'test',
        lastName: 'user',
        email: 'test@user.com',
        birthdate: new Date(2000,1,1,1),
        img: 'image',
        _id: 'any'
    }
}