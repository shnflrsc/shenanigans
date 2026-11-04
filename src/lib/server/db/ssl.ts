/** The hosted database refuses plain connections (SSL is enforced); the local stack does not speak SSL. */
export function sslFor(url: string): 'require' | false {
	const { hostname } = new URL(url);
	return ['localhost', '127.0.0.1', '[::1]', 'host.docker.internal'].includes(hostname)
		? false
		: 'require';
}
