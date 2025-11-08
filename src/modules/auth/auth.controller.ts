import { Controller, Post, Body, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { HttpResponse } from '../../common/dto/http-response.dto'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	@Post('register')
	@ApiOperation({ summary: 'Register a new user' })
	@ApiResponse({ status: 201, description: 'User registered successfully' })
	@ApiResponse({ status: 409, description: 'Email already exists' })
	async register(@Body() registerDto: RegisterDto) {
		const user = await this.authService.register(registerDto)
		return new HttpResponse(
			HttpStatus.CREATED,
			true,
			'User registered successfully',
			user,
		)
	}

	@Post('login')
	@ApiOperation({ summary: 'Login user' })
	@ApiResponse({ status: 200, description: 'Login successful' })
	@ApiResponse({ status: 401, description: 'Invalid credentials' })
	async login(@Body() loginDto: LoginDto) {
		const loginData = await this.authService.login(loginDto)
		return new HttpResponse(
			HttpStatus.OK,
			true,
			'Login successful',
			loginData,
		)
	}
}
