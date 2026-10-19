import { ZodError } from 'zod';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
      const validated = schema.parse(data);
      if (source === 'body') req.body = validated;
      else if (source === 'query') req.query = validated;
      else if (source === 'params') req.params = validated;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: errors[0]?.message || 'Validation failed',
          errors,
        });
      }
      next(err);
    }
  };
}
