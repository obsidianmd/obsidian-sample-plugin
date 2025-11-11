# Test File: Equations with Block IDs

This file contains various equations to test the Math Referencer plugin.

## Basic Equations

Here's a simple quadratic equation:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$
^quadratic-formula

And here's Einstein's famous equation:

$$
E = mc^2
$$
^einstein

## More Complex Equations

The Schrödinger equation:

$$
i\hbar\frac{\partial}{\partial t}\Psi(\mathbf{r},t) = \hat{H}\Psi(\mathbf{r},t)
$$
^schrodinger

Maxwell's equations in differential form:

$$
\nabla \cdot \mathbf{E} = \frac{\rho}{\epsilon_0}
$$
^maxwell-1

$$
\nabla \cdot \mathbf{B} = 0
$$
^maxwell-2

$$
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
$$
^maxwell-3

$$
\nabla \times \mathbf{B} = \mu_0\mathbf{J} + \mu_0\epsilon_0\frac{\partial \mathbf{E}}{\partial t}
$$
^maxwell-4

## Equation Without Block ID

This equation doesn't have a block ID:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

## Testing Edge Cases

### Code Block with $$ (Should NOT be numbered)

```python
# This should not be parsed as an equation
print("$$")
result = "$$equation$$"
```

### Empty Equation (Should be skipped)

$$
$$

This empty equation above should not be numbered.

## Multi-line Equations

The Fourier transform:

$$
F(\omega) = \int_{-\infty}^{\infty} f(t) e^{-i\omega t} dt
$$
^fourier-transform

The inverse Fourier transform:

$$
f(t) = \frac{1}{2\pi} \int_{-\infty}^{\infty} F(\omega) e^{i\omega t} d\omega
$$
^inverse-fourier

## Matrix Equation

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$
^matrix-multiply

## Summary

This file contains:
- Equations with block IDs
- Equations without block IDs
- Code blocks with $$ (should not be numbered)
- Empty equations (should be skipped)
- Multi-line equations
- Matrix equations

All numbered equations should appear with their equation numbers on the right side.
