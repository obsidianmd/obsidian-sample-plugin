# Test File: Equation References

This file tests the block reference functionality for equations.

## Referencing Equations from Another File

### Reference to Quadratic Formula

Here we reference the quadratic formula from the other file:

![[test-equations#^quadratic-formula]]

The equation above should render with its original equation number.

### Reference to Einstein's Equation

And here's Einstein's famous equation:

![[test-equations#^einstein]]

### Multiple References

We can reference the same equation multiple times:

First reference to Maxwell's first equation:
![[test-equations#^maxwell-1]]

Text in between...

Second reference to the same equation:
![[test-equations#^maxwell-1]]

Both should show the same equation number.

### References to Multiple Maxwell Equations

All four Maxwell equations:

![[test-equations#^maxwell-1]]

![[test-equations#^maxwell-2]]

![[test-equations#^maxwell-3]]

![[test-equations#^maxwell-4]]

### Reference to Fourier Transform

The Fourier transform and its inverse:

![[test-equations#^fourier-transform]]

![[test-equations#^inverse-fourier]]

### Reference to Matrix Equation

Matrix multiplication:

![[test-equations#^matrix-multiply]]

## Testing Self-References

This file also has its own equations:

$$
\sin^2(x) + \cos^2(x) = 1
$$
^pythagorean-identity

Now we can reference our own equation:

![[test-references#^pythagorean-identity]]

## Summary

This file tests:
- Block references to equations in another file
- Multiple references to the same equation
- References to various types of equations (simple, complex, multi-line, matrices)
- Self-references within the same file

All referenced equations should:
1. Render with the correct LaTeX content
2. Display the same equation number as in the original file
3. Have a highlighted background to distinguish them as references
