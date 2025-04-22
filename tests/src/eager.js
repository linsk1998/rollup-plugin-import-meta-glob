console.log(import.meta.glob('./dir/*.js', { eager: true }))
console.log(import.meta.glob('./dir/*.js', {
	import: 'setup',
	eager: true,
}))
console.log(import.meta.glob('./dir/*.js', {
	import: 'default',
	eager: true,
}))
